from django.conf import settings
from kubernetes import client
from eks_token import get_token
from json import dumps


SPIDER_JOB_COMMANDS = ["bm-crawl"]
JOB_TTL_SECONDS_AFTER_FINISHED = 600
BACKOFF_LIMIT = 2
POD_RESTART_POLICY = "Never"
IMAGE_PULL_POLICY = "Always"
SPIDER_NODE_ROLE = "bitmaker-spider"


def get_api_token():
    response = get_token(cluster_name=settings.CLUSTER_NAME)
    return response["status"]["token"]


def get_api_instance():
    configuration = client.Configuration()
    configuration.host = settings.CLUSTER_HOST
    configuration.verify_ssl = False
    configuration.api_key = {
        "authorization": "Bearer {}".format(get_api_token()),
    }
    api_instance = client.BatchV1Api(client.ApiClient(configuration))
    return api_instance


def create_job_object(name, container_image, namespace, container_name, env_vars):
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
        command=SPIDER_JOB_COMMANDS,
        image_pull_policy=IMAGE_PULL_POLICY,
    )
    template.template.spec = client.V1PodSpec(
        containers=[container],
        restart_policy=POD_RESTART_POLICY,
        node_selector={"role": SPIDER_NODE_ROLE},
    )

    body.spec = client.V1JobSpec(
        ttl_seconds_after_finished=JOB_TTL_SECONDS_AFTER_FINISHED,
        backoff_limit=BACKOFF_LIMIT,
        template=template.template,
    )
    return body


def create_job(
    name,
    spider_name,
    container_image,
    namespace="default",
    container_name="jobcontainer",
    env_vars=None,
    api_instance=None,
):
    if api_instance is None:
        api_instance = get_api_instance()
    if env_vars is None:
        env_vars = {}
    env_vars.update(
        [
            ("KAFKA_ADVERTISED_PORT", settings.KAFKA_PORT),
            ("KAFKA_ADVERTISED_HOST_NAME", settings.KAFKA_HOST),
            ("FIFO_PATH", "/fifo-data/{}.fifo".format(spider_name)),
            ("JOB_INFO", dumps({"spider": spider_name, "key": name})),
        ]
    )
    body = create_job_object(name, container_image, namespace, container_name, env_vars)
    api_response = api_instance.create_namespaced_job(namespace, body)
    return api_response


def delete_job(name, namespace="default", api_instance=None):
    if api_instance is None:
        api_instance = get_api_instance()
    api_response = api_instance.delete_namespaced_job(name, namespace)
    return api_response


def read_job(name, namespace="default", api_instance=None):
    if api_instance is None:
        api_instance = get_api_instance()
    api_response = api_instance.read_namespaced_job(name, namespace)
    return api_response
