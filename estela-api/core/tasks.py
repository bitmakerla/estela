from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from rest_framework.authtoken.models import Token

from api.serializers.job import SpiderJobCreateSerializer
from config.celery import app as celery_app
from config.job_manager import job_manager
from core.models import Spider, SpiderJob
from database_adapters.db_adapters import get_database_interface


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
    client = get_database_interface()
    if not client.get_connection():
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

    client.delete_collection_data(pid, job_collection_name)


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
