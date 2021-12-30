from django.conf import settings
from kubernetes import client, config
from kubernetes.client.exceptions import ApiException
from json import dumps


class KubernetesEngine:
    SPIDER_JOB_COMMANDS = ["bm-crawl"]  # Command to init crawling.
    JOB_TTL_SECONDS_AFTER_FINISHED = 86400  # 24 hours.
    BACKOFF_LIMIT = 2  # The number of retries before considering a Job as failed.
    JOB_TIME_CREATION = 20  # Tolerance time for a Job to be created.
    POD_RESTART_POLICY = "Never"
    IMAGE_PULL_POLICY = "Always"
    SPIDER_NODE_ROLE = "bitmaker-spider"
    IMAGE_PULL_SECRET_NAME = "regcred"

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
        self, name, container_image, namespace, container_name, env_vars
    ):
        body = client.V1Job(api_version="batch/v1", kind="Job")
        body.metadata = client.V1ObjectMeta(namespace=namespace, name=name)
        body.status = client.V1JobStatus()

        template = client.V1PodTemplate()
        template.template = client.V1PodTemplateSpec()

        env_list = []
        for env_name, env_value in env_vars.items():
            env_list.append(client.V1EnvVar(name=env_name, value=env_value))

        container = client.V1Container(
            name=container_name,
            image=container_image,
            env=env_list,
            command=self.SPIDER_JOB_COMMANDS,
            image_pull_policy=self.IMAGE_PULL_POLICY,
        )
        template.template.spec = client.V1PodSpec(
            containers=[container],
            restart_policy=self.POD_RESTART_POLICY,
            image_pull_secrets=[
                client.V1LocalObjectReference(self.IMAGE_PULL_SECRET_NAME)
            ],
            node_selector=(
                {"role": self.SPIDER_NODE_ROLE} if settings.MULTI_NODE_MODE else None
            ),
        )

        body.spec = client.V1JobSpec(
            ttl_seconds_after_finished=self.JOB_TTL_SECONDS_AFTER_FINISHED,
            backoff_limit=self.BACKOFF_LIMIT,
            template=template.template,
        )
        return body

    def create_job(
        self,
        name,
        key,
        spider_name,
        job_args,
        job_env_vars,
        container_image,
        namespace="default",
        container_name="jobcontainer",
        api_instance=None,
        auth_token=None,
    ):
        if api_instance is None:
            api_instance = self.get_api_instance()

        job_env_vars.update(
            [
                ("KAFKA_ADVERTISED_PORT", settings.KAFKA_PORT),
                ("KAFKA_ADVERTISED_LISTENERS", settings.KAFKA_HOSTS),
                ("FIFO_PATH", "/fifo-data/{}.fifo".format(spider_name)),
                (
                    "JOB_INFO",
                    dumps(
                        {
                            "spider": spider_name,
                            "api_host": settings.DJANGO_API_HOST,
                            "auth_token": auth_token,
                            "key": key,
                            "args": job_args,
                            "env_vars": job_env_vars,
                        }
                    ),
                ),
            ]
        )

        body = self.create_job_object(
            name, container_image, namespace, container_name, job_env_vars
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
