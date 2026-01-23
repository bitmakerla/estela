"""
Docker Engine for Estela - Runs spider jobs as Docker containers instead of Kubernetes Jobs.

This engine provides a simpler alternative to Kubernetes for local/small deployments.
It uses the Docker SDK to create, monitor, and manage containers.

Key differences from Kubernetes Engine:
- Containers run directly on the Docker host (no pod scheduling)
- No node selectors or multi-node support
- Simpler networking (uses Docker networks)
- Direct access to Docker socket for builds
"""

import logging
from json import dumps
from typing import Dict, Optional, Any

import docker
from docker.errors import NotFound, APIError, ImageNotFound
from django.conf import settings


logger = logging.getLogger(__name__)


class DockerEngine:
    """
    Docker-based job engine for running spider jobs as containers.

    This is a drop-in replacement for KubernetesEngine that runs jobs
    as Docker containers instead of Kubernetes Jobs.
    """

    # Container cleanup after 24 hours (matches K8s TTL)
    CONTAINER_TTL_SECONDS = 86400

    # Retry limit for failed containers
    BACKOFF_LIMIT = 2

    # Time tolerance for job creation
    JOB_TIME_CREATION = 20

    # Default restart policy
    RESTART_POLICY = {"Name": "no"}

    # Image pull policy - can be 'always', 'missing', or 'never'
    IMAGE_PULL_POLICY = "always"

    # Network name for estela containers
    NETWORK_NAME = "estela-network"

    # Container label prefix for identification
    LABEL_PREFIX = "estela"

    # Credentials manager (set externally)
    CREDENTIALS = None

    class Status:
        """
        Container status wrapper that mimics Kubernetes Job status.

        Maps Docker container states to K8s-like status:
        - running -> active=1, succeeded=None, failed=None
        - exited(0) -> active=None, succeeded=1, failed=None
        - exited(non-0) -> active=None, succeeded=None, failed=1
        - created/paused -> active=1 (waiting to run)
        """

        def __init__(self, container_status: str, exit_code: Optional[int] = None):
            self.active = None
            self.succeeded = None
            self.failed = None

            if container_status in ("running", "created", "restarting"):
                self.active = 1
            elif container_status == "exited":
                if exit_code == 0:
                    self.succeeded = 1
                else:
                    self.failed = 1
            elif container_status in ("dead", "removing"):
                self.failed = 1
            elif container_status == "paused":
                self.active = 1

    class Job:
        """
        Container wrapper that mimics Kubernetes Job object.

        Provides a consistent interface regardless of whether
        we're using Docker or Kubernetes as the backend.
        """

        def __init__(self, container):
            self.name = container.name
            self.container = container

            # Get container state
            container.reload()
            status = container.status
            exit_code = container.attrs.get("State", {}).get("ExitCode")

            self.status = DockerEngine.Status(status, exit_code)

    def __init__(self):
        """Initialize Docker client."""
        self._client = None

    def get_client(self) -> docker.DockerClient:
        """
        Get or create Docker client.

        Uses the default Docker socket. In docker-compose, this is typically
        mounted from /var/run/docker.sock.
        """
        if self._client is None:
            try:
                self._client = docker.from_env()
                # Test connection
                self._client.ping()
            except Exception as e:
                logger.error(f"Failed to connect to Docker daemon: {e}")
                raise
        return self._client

    def get_api_instance(self):
        """
        Return Docker client (for compatibility with Kubernetes interface).

        In Kubernetes, this returns BatchV1Api. Here we return the Docker client.
        """
        return self.get_client()

    def _ensure_network(self, client: docker.DockerClient) -> str:
        """
        Ensure the estela network exists.

        Creates a bridge network if it doesn't exist. This network allows
        containers to communicate with each other and with external services.
        """
        try:
            network = client.networks.get(self.NETWORK_NAME)
            return network.name
        except NotFound:
            logger.info(f"Creating Docker network: {self.NETWORK_NAME}")
            network = client.networks.create(
                self.NETWORK_NAME,
                driver="bridge",
                labels={f"{self.LABEL_PREFIX}.managed": "true"}
            )
            return network.name

    def _get_container_labels(self, name: str, is_build: bool = False) -> Dict[str, str]:
        """
        Generate labels for container identification and management.

        Labels are used to:
        - Identify estela-managed containers
        - Track job type (spider vs build)
        - Enable cleanup of old containers
        """
        return {
            f"{self.LABEL_PREFIX}.managed": "true",
            f"{self.LABEL_PREFIX}.job.name": name,
            f"{self.LABEL_PREFIX}.job.type": "build" if is_build else "spider",
        }

    def _prepare_environment(
        self,
        key: str,
        collection: str,
        spider_name: str,
        job_args: Dict,
        job_env_vars: Dict,
        auth_token: Optional[str],
        unique: bool,
        is_build: bool = False
    ) -> Dict[str, str]:
        """
        Prepare environment variables for the container.

        This matches what KubernetesEngine does:
        - Add queue parameters (Kafka connection)
        - Add Redis URL for stats
        - Add JOB_INFO JSON with job metadata
        - For builds, add credentials
        """
        env = dict(job_env_vars)

        # Add queue parameters (Kafka settings)
        env.update(settings.QUEUE_PARAMS)

        # Add Redis settings for stats
        env["REDIS_URL"] = settings.REDIS_URL
        env["REDIS_STATS_KEY"] = f"scrapy_stats_{key}"
        env["REDIS_STATS_INTERVAL"] = settings.REDIS_STATS_INTERVAL

        # Add JOB_INFO JSON (used by estela-crawl command)
        job_info = {
            "spider": spider_name,
            "api_host": settings.DJANGO_API_HOST,
            "auth_token": auth_token,
            "key": key,
            "collection": collection,
            "args": job_args,
            "env_vars": job_env_vars,
            "unique": str(unique),
        }
        env["JOB_INFO"] = dumps(job_info)

        # For build jobs, add credentials
        if is_build and self.CREDENTIALS:
            env.update(self.CREDENTIALS.get_credentials())

        return env

    def _pull_image_if_needed(self, client: docker.DockerClient, image: str) -> bool:
        """
        Pull image if it doesn't exist locally or if pull policy is 'always'.

        Returns True if image is available, False if pull failed.
        """
        try:
            if self.IMAGE_PULL_POLICY == "always":
                logger.info(f"Pulling image: {image}")
                client.images.pull(image)
                return True
            elif self.IMAGE_PULL_POLICY == "missing":
                try:
                    client.images.get(image)
                    return True
                except ImageNotFound:
                    logger.info(f"Image not found locally, pulling: {image}")
                    client.images.pull(image)
                    return True
            else:  # never
                client.images.get(image)
                return True
        except Exception as e:
            logger.error(f"Failed to get/pull image {image}: {e}")
            return False

    def create_job(
        self,
        name: str,
        key: str,
        collection: str = "",
        spider_name: str = "",
        job_args: Dict = None,
        job_env_vars: Dict = None,
        container_image: str = "",
        namespace: str = "default",  # Ignored in Docker, kept for compatibility
        container_name: str = "jobcontainer",  # Ignored, we use 'name'
        api_instance=None,
        auth_token: Optional[str] = None,
        unique: bool = False,
        volume: Dict = None,
        command: list = None,
        isbuild: bool = False,
    ) -> "DockerEngine.Job":
        """
        Create and start a Docker container for the job.

        This is the main entry point that replaces Kubernetes Job creation.

        For spider jobs:
        - Creates a single container running the spider image
        - Mounts volumes if specified
        - Sets up environment for Kafka/Redis communication

        For build jobs:
        - Creates a container that builds the spider image
        - Requires Docker socket access for DinD
        - Uses estela-build-project image
        """
        if job_args is None:
            job_args = {}
        if job_env_vars is None:
            job_env_vars = {}
        if command is None:
            command = ["estela-crawl"]
        if volume is None:
            volume = {}

        client = api_instance or self.get_client()

        # Ensure network exists
        network = self._ensure_network(client)

        # Remove existing container with same name (if any)
        try:
            existing = client.containers.get(name)
            logger.warning(f"Removing existing container: {name}")
            existing.remove(force=True)
        except NotFound:
            pass

        # Prepare environment variables
        env = self._prepare_environment(
            key=key,
            collection=collection,
            spider_name=spider_name,
            job_args=job_args,
            job_env_vars=dict(job_env_vars),
            auth_token=auth_token,
            unique=unique,
            is_build=isbuild
        )

        # Get labels
        labels = self._get_container_labels(name, isbuild)

        # Prepare volumes
        volumes = {}
        if volume and volume.get("path"):
            volumes[volume["path"]] = {
                "bind": volume["path"],
                "mode": "rw"
            }

        # For build jobs, mount Docker socket
        if isbuild:
            volumes["/var/run/docker.sock"] = {
                "bind": "/var/run/docker.sock",
                "mode": "rw"
            }

        # Pull image if needed
        if not self._pull_image_if_needed(client, container_image):
            # Create a failed job status
            raise APIError(f"Failed to pull image: {container_image}")

        try:
            # Create and start container
            container = client.containers.run(
                image=container_image,
                name=name,
                command=command,
                environment=env,
                volumes=volumes,
                network=network,
                labels=labels,
                detach=True,  # Run in background
                remove=False,  # Keep container after exit for status checking
                restart_policy=self.RESTART_POLICY,
                # Security: drop all capabilities for spider jobs (not builds)
                cap_drop=["ALL"] if not isbuild else None,
                # Run as non-root for spider jobs
                user="1000:1000" if not isbuild else None,
            )

            logger.info(f"Created container: {name} (id: {container.short_id})")
            return self.Job(container)

        except APIError as e:
            logger.error(f"Failed to create container {name}: {e}")
            raise

    def delete_job(
        self,
        name: str,
        namespace: str = "default",  # Ignored
        api_instance=None
    ) -> Optional[Any]:
        """
        Delete a container by name.

        Stops the container if running, then removes it.
        """
        client = api_instance or self.get_client()

        try:
            container = client.containers.get(name)
            container.remove(force=True)
            logger.info(f"Deleted container: {name}")
            return {"status": "deleted"}
        except NotFound:
            logger.warning(f"Container not found for deletion: {name}")
            return None
        except APIError as e:
            logger.error(f"Failed to delete container {name}: {e}")
            return None

    def read_job(
        self,
        name: str,
        namespace: str = "default",  # Ignored
        api_instance=None
    ) -> Optional["DockerEngine.Job"]:
        """
        Read container info by name.

        Returns a Job object with the container's current status,
        or None if container doesn't exist.
        """
        client = api_instance or self.get_client()

        try:
            container = client.containers.get(name)
            return self.Job(container)
        except NotFound:
            logger.debug(f"Container not found: {name}")
            return None
        except APIError as e:
            logger.error(f"Failed to read container {name}: {e}")
            return None

    def read_job_status(
        self,
        name: str,
        namespace: str = "default",  # Ignored
        api_instance=None
    ) -> Optional["DockerEngine.Status"]:
        """
        Read just the status of a container.

        This is used by Celery tasks to check if jobs have completed.
        """
        job = self.read_job(name, namespace, api_instance)
        if job:
            return job.status
        return None

    def cleanup_old_containers(self, max_age_seconds: int = None) -> int:
        """
        Remove old estela containers that have finished.

        This is a maintenance function that can be called periodically
        to clean up containers that have exceeded their TTL.

        Returns the number of containers removed.
        """
        if max_age_seconds is None:
            max_age_seconds = self.CONTAINER_TTL_SECONDS

        client = self.get_client()
        removed = 0

        # Find all estela-managed containers
        filters = {"label": f"{self.LABEL_PREFIX}.managed=true"}
        containers = client.containers.list(all=True, filters=filters)

        for container in containers:
            container.reload()

            # Skip running containers
            if container.status == "running":
                continue

            # Check age
            # Note: Would need to parse container.attrs["State"]["FinishedAt"]
            # For simplicity, we remove all non-running containers for now
            try:
                container.remove(force=True)
                removed += 1
                logger.info(f"Cleaned up container: {container.name}")
            except APIError as e:
                logger.warning(f"Failed to clean up {container.name}: {e}")

        return removed

    def get_container_logs(
        self,
        name: str,
        tail: int = 100
    ) -> Optional[str]:
        """
        Get logs from a container.

        Useful for debugging failed jobs.
        """
        client = self.get_client()

        try:
            container = client.containers.get(name)
            return container.logs(tail=tail).decode("utf-8")
        except NotFound:
            return None
        except APIError as e:
            logger.error(f"Failed to get logs for {name}: {e}")
            return None
