from json import dumps

from django.conf import settings
from kubernetes import client, config
from kubernetes.client.exceptions import ApiException


class KubernetesEngine:
    JOB_TTL_SECONDS_AFTER_FINISHED = 86400  # 24 hours.
    BACKOFF_LIMIT = 2  # The number of retries before considering a Job as failed.
    JOB_TIME_CREATION = 20  # Tolerance time for a Job to be created.
    POD_RESTART_POLICY = "Never"
    IMAGE_PULL_POLICY = "Always"
    SPIDER_NODE_ROLE = "estela-spider"
    IMAGE_PULL_SECRET_NAME = "regcred"
    CREDENTIALS = None

    class Status:
        def __init__(self, kubernetes_status):
            self.active = kubernetes_status.active
            self.succeeded = kubernetes_status.succeeded
            self.failed = kubernetes_status.failed

    class Job:
        def __init__(self, kubernetes_job):
            self.name = kubernetes_job._metadata.name
            self.status = KubernetesEngine.Status(kubernetes_job.status)

    def get_api_instance(self):
        config.load_incluster_config()
        return client.BatchV1Api()

    def create_job_object(
        self,
        name,
        container_image,
        namespace,
        container_name,
        env_vars,
        volume_spec,
        command,
        isbuild,
    ):
        body = client.V1Job(api_version="batch/v1", kind="Job")
        body.metadata = client.V1ObjectMeta(namespace=namespace, name=name)
        body.status = client.V1JobStatus()

        template = client.V1PodTemplate()
        template.template = client.V1PodTemplateSpec()

        env_list = []
        for env_name, env_value in env_vars.items():
            env_list.append(client.V1EnvVar(name=env_name, value=env_value))
        if isbuild:
            for env_name, env_value in self.CREDENTIALS.get_credentials().items():
                env_list.append(client.V1EnvVar(name=env_name, value=env_value))

        volume = volume_mount = None
        if volume_spec:
            volume_mount = client.V1VolumeMount(
                name=volume_spec["name"],
                mount_path=volume_spec["path"],
            )
            host_path = client.V1HostPathVolumeSource(
                path=volume_spec["path"],
            )
            volume = client.V1Volume(
                name=volume_spec["name"],
                host_path=host_path,
            )

        container = client.V1Container(
            name=container_name,
            image=container_image,
            env=env_list,
            command=command,
            image_pull_policy=self.IMAGE_PULL_POLICY,
            volume_mounts=[volume_mount] if volume_mount else None,
        )
        if not isbuild:
            # Regular spider job containers
            container.security_context = client.V1SecurityContext(
                capabilities=client.V1Capabilities(drop=["ALL"])
            )
            containers = [container]
            init_containers = []
        else:
            # Build job: Create 3-container pipeline
            containers, init_containers = self._create_build_containers(
                container_name, container_image, env_list
            )

        pod_spec = client.V1PodSpec(
            containers=containers,
            init_containers=init_containers,
            restart_policy=self.POD_RESTART_POLICY,
            image_pull_secrets=[
                client.V1LocalObjectReference(self.IMAGE_PULL_SECRET_NAME)
            ],
            volumes=(
                self._create_build_volumes()
                if isbuild
                else ([volume] if volume else None)
            ),
            node_selector={"role": self.SPIDER_NODE_ROLE}
            if settings.MULTI_NODE_MODE == "True"
            else None,
        )
        if not isbuild:
            pod_spec.security_context = client.V1PodSecurityContext(
                run_as_non_root=True, run_as_user=1000
            )

        template.template.spec = pod_spec
        # Build jobs shouldn't retry - if a build fails, retrying won't fix it
        backoff_limit = 0 if isbuild else self.BACKOFF_LIMIT
        body.spec = client.V1JobSpec(
            ttl_seconds_after_finished=self.JOB_TTL_SECONDS_AFTER_FINISHED,
            backoff_limit=backoff_limit,
            template=template.template,
        )
        return body

    def create_job(
        self,
        name,
        key,
        collection="",
        spider_name="",
        job_args=[],
        job_env_vars=[],
        container_image="",
        namespace="default",
        container_name="jobcontainer",
        api_instance=None,
        auth_token=None,
        unique=False,
        volume={},
        command=["estela-crawl"],
        isbuild=False,
    ):
        if api_instance is None:
            api_instance = self.get_api_instance()

        job_env_vars.update(list(settings.QUEUE_PARAMS.items()))
        job_env_vars.update(
            [
                ("REDIS_URL", settings.REDIS_URL),
                ("REDIS_STATS_KEY", f"scrapy_stats_{key}"),
                ("REDIS_STATS_INTERVAL", settings.REDIS_STATS_INTERVAL),
                (
                    "JOB_INFO",
                    dumps(
                        {
                            "spider": spider_name,
                            "api_host": settings.DJANGO_API_HOST,
                            "auth_token": auth_token,
                            "key": key,
                            "collection": collection,
                            "args": job_args,
                            "env_vars": job_env_vars,
                            "unique": str(unique),
                        }
                    ),
                ),
            ]
        )

        body = self.create_job_object(
            name,
            container_image,
            namespace,
            container_name,
            job_env_vars,
            volume,
            command,
            isbuild,
        )

        api_response = api_instance.create_namespaced_job(namespace, body)
        return self.Job(api_response)

    def delete_job(self, name, namespace="default", api_instance=None):
        if api_instance is None:
            api_instance = self.get_api_instance()

        try:
            api_response = api_instance.delete_namespaced_job(
                name, namespace, propagation_policy="Foreground"
            )
        except ApiException:
            return None

        return api_response

    def read_job(self, name, namespace="default", api_instance=None):
        if api_instance is None:
            api_instance = self.get_api_instance()

        try:
            api_response = api_instance.read_namespaced_job(name, namespace)
        except ApiException:
            return None

        return self.Job(api_response)

    def read_job_status(self, name, namespace="default", api_instance=None):
        if api_instance is None:
            api_instance = self.get_api_instance()

        try:
            api_response = api_instance.read_namespaced_job_status(name, namespace)
        except ApiException:
            return None

        return self.Status(api_response.status)

    def _create_build_volumes(self):
        """Create shared volume for build containers"""
        return [
            client.V1Volume(
                name="shared-workspace",
                empty_dir=client.V1EmptyDirVolumeSource()
            )
        ]

    def _create_build_containers(self, _container_name, target_image, env_list):
        """Create 3-container build pipeline: downloader + kaniko + spider-status"""

        # Extract the actual target image name from environment variables
        actual_target_image = None
        for env in env_list:
            if env.name == "CONTAINER_IMAGE":
                actual_target_image = env.value
                break

        if not actual_target_image:
            # Fallback to passed target_image parameter if CONTAINER_IMAGE not in env
            actual_target_image = target_image

        shared_volume_mount = client.V1VolumeMount(
            name="shared-workspace", mount_path="/shared"
        )
        
        # Init Container 1: Download and extract project
        downloader_container = client.V1Container(
            name="project-downloader",
            image=settings.DOWNLOADER_IMAGE,
            env=env_list,
            volume_mounts=[shared_volume_mount],
            resources=client.V1ResourceRequirements(
                limits={"memory": "512Mi", "cpu": "500m"},
                requests={"memory": "256Mi", "cpu": "250m"}
            ),
            security_context=client.V1SecurityContext(
                run_as_non_root=True,
                run_as_user=1000,
                capabilities=client.V1Capabilities(drop=["ALL"])
            )
        )
        
        # Init Container 2: Kaniko build
        kaniko_container = client.V1Container(
            name="kaniko-builder",
            image="gcr.io/kaniko-project/executor:v1.21.0",
            args=[
                "--dockerfile=/shared/project/.estela/Dockerfile-estela",
                "--context=/shared/project",
                f"--destination={actual_target_image}",  # Build actual target image
                "--cache=true",
                "--cache-repo=094814489188.dkr.ecr.us-east-2.amazonaws.com/"
                "bitmaker-projects-cache",
                "--cache-ttl=168h",  # 7 days cache
                "--compressed-caching=false",
                "--single-snapshot=true",
                "--skip-unused-stages=true",  # Skip building unused stages
                "--snapshot-mode=redo",  # Faster snapshot mode
            ],
            volume_mounts=[shared_volume_mount],
            resources=client.V1ResourceRequirements(
                limits={"memory": "2Gi", "cpu": "2"},  # More CPU for faster builds
                requests={"memory": "1Gi", "cpu": "1"}
            ),
            env=[
                client.V1EnvVar(name="AWS_REGION", value="us-east-2"),
                # Add ECR authentication env vars from self.CREDENTIALS
            ]
            + [
                client.V1EnvVar(name=env.name, value=env.value)
                for env in env_list
                if env.name in ["REGISTRY_TOKEN", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"]
            ],
        )
        
        # Main Container: Spider detection + status update (THE BUILT IMAGE ITSELF)
        # Uses estela-report-deploy command from estela-entrypoint package
        spider_status_container = client.V1Container(
            name="spider-status",
            image=actual_target_image,  # The image that Kaniko just built!
            env=env_list,
            command=["estela-report-deploy"],  # Command provided by estela-entrypoint
            volume_mounts=[shared_volume_mount],
            resources=client.V1ResourceRequirements(
                limits={"memory": "512Mi", "cpu": "500m"},
                requests={"memory": "256Mi", "cpu": "250m"}
            ),
            image_pull_policy=self.IMAGE_PULL_POLICY,
            # No security context restrictions - uses the built image's defaults
        )

        init_containers = [downloader_container, kaniko_container]
        containers = [spider_status_container]

        return containers, init_containers
