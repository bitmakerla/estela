from ***REMOVED***.conf import settings
from kubernetes import client, config
from kubernetes.client.exceptions import ApiException
from json import dumps


SINGLE_JOB = "SINGLE_JOB"
CRON_JOB = "CRON_JOB"
SPIDER_JOB_COMMANDS = ["bm-crawl"]
JOB_TTL_SECONDS_AFTER_FINISHED = 86400  # 24 hours
BACKOFF_LIMIT = 2
JOB_TIME_CREATION = 20
POD_RESTART_POLICY = "Never"
IMAGE_PULL_POLICY = "Always"
SPIDER_NODE_ROLE = "bitmaker-spider"
IMAGE_PULL_SECRET_NAME = "regcred"


DEFAULT_SCHEDULE = "0 0 * * *"  # Run job every day at midnight
SUCCESSFUL_JOB_HISTORY_LIMIT = 2
FAILED_JOB_HISTORY_LIMIT = 1


def get_api_instance(api_class=SINGLE_JOB):
    config.load_incluster_config()
    api_instance = None

    if api_class == SINGLE_JOB:
        api_instance = client.BatchV1Api()
    elif api_class == CRON_JOB:
        api_instance = client.BatchV1beta1Api()

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
        image_pull_secrets=[client.V1LocalObjectReference(IMAGE_PULL_SECRET_NAME)],
        node_selector=(
            {"role": SPIDER_NODE_ROLE} if settings.MULTI_NODE_MODE else None
        ),
    )

    body.spec = client.V1JobSpec(
        ttl_seconds_after_finished=JOB_TTL_SECONDS_AFTER_FINISHED,
        backoff_limit=BACKOFF_LIMIT,
        template=template.template,
    )
    return body


def create_cronjob_object(
    name, container_image, namespace, container_name, env_vars, schedule
):
    body = client.V1beta1CronJob(api_version="batch/v1beta1", kind="CronJob")
    body.metadata = client.V1ObjectMeta(namespace=namespace, name=name)
    body.status = client.V1beta1CronJobStatus()

    job_template = client.V1beta1JobTemplateSpec()
    template = client.V1PodTemplateSpec()

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
    template.spec = client.V1PodSpec(
        containers=[container],
        restart_policy=POD_RESTART_POLICY,
        image_pull_secrets=[client.V1LocalObjectReference(IMAGE_PULL_SECRET_NAME)],
        node_selector=(
            {"role": SPIDER_NODE_ROLE} if settings.MULTI_NODE_MODE else None
        ),
    )

    job_template.spec = client.V1JobSpec(
        backoff_limit=BACKOFF_LIMIT,
        template=template,
    )

    body.spec = client.V1beta1CronJobSpec(
        schedule=schedule,
        job_template=job_template,
        successful_jobs_history_limit=SUCCESSFUL_JOB_HISTORY_LIMIT,
        failed_jobs_history_limit=FAILED_JOB_HISTORY_LIMIT,
    )
    return body


def create_job(
    name,
    key,
    spider_name,
    job_args,
    container_image,
    job_type=SINGLE_JOB,
    namespace="default",
    container_name="jobcontainer",
    schedule="",
    env_vars=None,
    api_instance=None,
    auth_token=None,
):
    if api_instance is None:
        api_instance = get_api_instance(job_type)
    if env_vars is None:
        env_vars = {}
    env_vars.update(
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
                    }
                ),
            ),
        ]
    )

    api_response = None

    if job_type == SINGLE_JOB:
        body = create_job_object(
            name, container_image, namespace, container_name, env_vars
        )
        api_response = api_instance.create_namespaced_job(namespace, body)

    elif job_type == CRON_JOB:
        if not schedule:
            schedule = DEFAULT_SCHEDULE
        body = create_cronjob_object(
            name, container_image, namespace, container_name, env_vars, schedule
        )
        api_response = api_instance.create_namespaced_cron_job(namespace, body)

    return api_response


def delete_job(name, namespace="default", api_instance=None, job_type=SINGLE_JOB):
    if api_instance is None:
        api_instance = get_api_instance(job_type)

    api_response = None

    try:
        if job_type == SINGLE_JOB:
            api_response = api_instance.delete_namespaced_job(
                name, namespace, propagation_policy="Foreground"
            )
        elif job_type == CRON_JOB:
            api_response = api_instance.delete_namespaced_cron_job(
                name, namespace, propagation_policy="Foreground"
            )
    except ApiException:
        return None

    return api_response


def read_job(name, namespace="default", api_instance=None, job_type=SINGLE_JOB):
    if api_instance is None:
        api_instance = get_api_instance(job_type)

    api_response = None

    try:
        if job_type == SINGLE_JOB:
            api_response = api_instance.read_namespaced_job(name, namespace)
        elif job_type == CRON_JOB:
            api_response = api_instance.read_namespaced_cron_job(name, namespace)
    except ApiException:
        return None

    return api_response


def read_job_status(name, namespace="default", api_instance=None, job_type=SINGLE_JOB):
    if api_instance is None:
        api_instance = get_api_instance(job_type)

    api_response = None

    try:
        if job_type == SINGLE_JOB:
            api_response = api_instance.read_namespaced_job_status(name, namespace)
        elif job_type == CRON_JOB:
            api_response = api_instance.read_namespaced_cron_job_status(name, namespace)
    except ApiException:
        return None

    return api_response
