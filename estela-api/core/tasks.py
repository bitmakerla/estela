from datetime import timedelta

from celery.exceptions import TaskError
from django.conf import settings
from django.utils import timezone
from rest_framework.authtoken.models import Token

from api.serializers.job import SpiderJobCreateSerializer
from config.celery import app as celery_app
from config.job_manager import job_manager, spiderdata_db_client
from core.models import Project, Spider, SpiderJob, UsageRecord


def get_default_token(job):
    user = job.spider.project.users.first()
    if not user:
        return None
    token, _ = Token.objects.get_or_create(user=user)
    return token.key


@celery_app.task
def run_spider_jobs():
    jobs = SpiderJob.objects.filter(status=SpiderJob.IN_QUEUE_STATUS)[
        : settings.RUN_JOBS_PER_LOT
    ]

    for job in jobs:
        job_args = {arg.name: arg.value for arg in job.args.all()}
        job_env_vars = {env_var.name: env_var.value for env_var in job.env_vars.all()}
        job.status = SpiderJob.WAITING_STATUS
        job.save()
        job_manager.create_job(
            job.name,
            job.key,
            job.key,
            job.spider.name,
            job_args,
            job_env_vars,
            job.spider.project.container_image,
            auth_token=get_default_token(job),
        )


def delete_data(pid, sid, jid, data_type):
    if not spiderdata_db_client.get_connection():
        return False
    job = SpiderJob.objects.get(jid=jid)
    if (
        job.cronjob is not None
        and job.cronjob.unique_collection
        and data_type == "items"
    ):
        job_collection_name = "{}-scj{}-job_{}".format(sid, job.cronjob.cjid, data_type)
    else:
        job_collection_name = "{}-{}-job_{}".format(sid, jid, data_type)

    spiderdata_db_client.delete_collection_data(pid, job_collection_name)


@celery_app.task()
def delete_job_data(job_key):
    jid, sid, pid = job_key.split(".")
    delete_data(pid, sid, jid, "items")
    delete_data(pid, sid, jid, "requests")
    SpiderJob.objects.filter(jid=jid).update(data_status=SpiderJob.DELETED_STATUS)


@celery_app.task(name="core.tasks.delete_expired_jobs_data")
def delete_expired_jobs_data():
    pending_data_delete_jobs = SpiderJob.objects.filter(
        data_status=SpiderJob.PENDING_STATUS,
        status__in=[SpiderJob.COMPLETED_STATUS, SpiderJob.STOPPED_STATUS],
    )

    for job in pending_data_delete_jobs:
        if job.created < timezone.now() - timedelta(days=job.data_expiry_days):
            delete_job_data.s(job.key).delay()


@celery_app.task(name="core.tasks.launch_job")
def launch_job(sid_, data_, data_expiry_days=None, token=None):
    spider = Spider.objects.get(sid=sid_)

    if data_expiry_days is None:
        data_["data_status"] = SpiderJob.PERSISTENT_STATUS
    else:
        data_["data_status"] = SpiderJob.PENDING_STATUS

    serializer = SpiderJobCreateSerializer(data=data_)
    serializer.is_valid(raise_exception=True)
    job = serializer.save(spider=spider, data_expiry_days=data_expiry_days)

    collection = job.key

    if job.cronjob.unique_collection:
        collection = "scj{}".format(job.cronjob.key)

    if token is None:
        token = get_default_token(job)

    job_args = {arg.name: arg.value for arg in job.args.all()}
    job_env_vars = {env_var.name: env_var.value for env_var in job.env_vars.all()}
    job_manager.create_job(
        job.name,
        job.key,
        collection,
        job.spider.name,
        job_args,
        job_env_vars,
        job.spider.project.container_image,
        auth_token=token,
        unique=job.cronjob.unique_collection,
    )


@celery_app.task(name="core.tasks.check_and_update_job_status_errors")
def check_and_update_job_status_errors():
    jobs = SpiderJob.objects.filter(status=SpiderJob.WAITING_STATUS)[
        : settings.CHECK_JOB_ERRORS_BATCH_SIZE
    ]

    for job in jobs:
        job_status = job_manager.read_job_status(job.name)
        if job_status is None or (
            job_status.active is None and job_status.succeeded is None
        ):
            job.status = SpiderJob.ERROR_STATUS
            job.save()


@celery_app.task(
    max_retries=None,
    autoretry_for=(TaskError,),
    retry_kwargs={"max_retries": None, "countdown": 600},
)
def record_project_usage_after_data_delete(project_id, job_id):
    if not spiderdata_db_client.get_connection():
        raise TaskError("Could not get a connection to the database.")

    project = Project.objects.get(pid=project_id)
    items_data_size = spiderdata_db_client.get_database_size(str(project.pid), "items")
    requests_data_size = spiderdata_db_client.get_database_size(
        str(project.pid), "requests"
    )
    logs_data_size = spiderdata_db_client.get_database_size(str(project.pid), "logs")

    new_usage_record = UsageRecord.objects.filter(project=project).first()
    new_usage_record.pk = None
    new_usage_record._state.adding = True

    job = SpiderJob.objects.get(jid=job_id)
    new_usage_record.item_count -= job.item_count
    new_usage_record.request_count -= job.request_count
    new_usage_record.items_data_size = items_data_size
    new_usage_record.requests_data_size = requests_data_size
    new_usage_record.logs_data_size = logs_data_size
    new_usage_record.save()


@celery_app.task(
    max_retries=None,
    autoretry_for=(TaskError,),
    retry_kwargs={"max_retries": None, "countdown": 600},
)
def record_project_usage_after_job_event(job_id):
    if not spiderdata_db_client.get_connection():
        raise TaskError("Could not get a connection to the database.")

    job = SpiderJob.objects.get(jid=job_id)
    project = job.spider.project
    if job.cronjob is not None and job.cronjob.unique_collection:
        items_collection_name = "{}-scj{}-job_items".format(
            job.spider.sid, job.cronjob.cjid
        )
        items_data_size = spiderdata_db_client.get_database_size(
            str(project.pid), "items"
        )
        unique_collection = True
    else:
        items_collection_name = "{}-{}-job_items".format(job.spider.sid, job.jid)
        items_data_size = spiderdata_db_client.get_collection_size(
            str(project.pid), items_collection_name
        )
        unique_collection = False
    requests_collection_name = "{}-{}-job_requests".format(job.spider.sid, job.jid)
    requests_data_size = spiderdata_db_client.get_collection_size(
        str(project.pid), requests_collection_name
    )
    logs_collection_name = "{}-{}-job_logs".format(job.spider.sid, job.jid)
    logs_data_size = spiderdata_db_client.get_collection_size(
        str(project.pid), logs_collection_name
    )

    updated_values = {
        "processing_time": job.lifespan,
        "network_usage": job.total_response_bytes,
        "item_count": job.item_count,
        "request_count": job.request_count,
        "requests_data_size": requests_data_size,
        "logs_data_size": logs_data_size,
    }
    last_usage_record = UsageRecord.objects.filter(project=project).first()
    if last_usage_record:
        for field in updated_values.keys():
            updated_values[field] += getattr(last_usage_record, field)
    else:
        last_usage_record = UsageRecord()
        last_usage_record.items_data_size = 0

    new_items_data_size = (
        items_data_size
        if unique_collection
        else last_usage_record.items_data_size + items_data_size
    )
    usage_record = UsageRecord.objects.create(
        project=project,
        items_data_size=new_items_data_size,
        **updated_values,
    )
