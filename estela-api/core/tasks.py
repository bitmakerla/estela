from datetime import datetime, timedelta
from time import time
from django.conf import settings
from config.celery import app as celery_app
from django.utils import timezone
from core.models import SpiderJob, Spider
from core.mongo import get_client
from config.job_manager import job_manager
from rest_framework.authtoken.models import Token

from api.serializers.job import SpiderJobCreateSerializer


def get_default_token(job):
    user = job.spider.project.users.first()
    if not user:
        return None
    token, _ = Token.objects.get_or_create(user=user)
    return token.key


def delete_data(pid, sid, jid):
    client = get_client(settings.MONGO_CONNECTION)
    data_type = "items"
    job = SpiderJob.objects.filter(jid=jid).get()
    if (
        job.cronjob is not None
        and job.cronjob.unique_collection
    ):
        job_collection_name = "{}-scj{}-job_{}".format(
            sid, job.cronjob.cjid, data_type
        )
    else:
        job_collection_name = "{}-{}-job_{}".format(
            sid, jid, data_type
        )
    job_collection = client[pid][job_collection_name]
    res = job_collection.delete_many({})


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


@celery_app.task(name="core.tasks.delete_job_data")
def delete_job_data():
    jobs = SpiderJob.objects.filter(status_data=SpiderJob.NON_DELETED_STATUS)[
        : settings.RUN_JOBS_PER_LOT
    ]

    for job in jobs:
        jid, sid, pid = job.key.split(".")
        m, d = job.expiration_date.split("/")
        if timezone.now() - timedelta(days=(m * 30 + d)) > job.created:
        # if timezone.now() - timedelta(seconds=120) > job.created:
            delete_data(pid, sid, jid)
            job.status_data = SpiderJob.DELETED_STATUS
            job.save()


@celery_app.task(name="core.tasks.launch_job")
def launch_job(sid_, data_, expiration_date=None,token=None):
    spider = Spider.objects.get(sid=sid_)
    serializer = SpiderJobCreateSerializer(data=data_)

    if expiration_date is None:
        status_data = SpiderJob.PERMANENT_STATUS
        expiration_date = ""
    else:
        status_data = SpiderJob.NON_DELETED_STATUS

    serializer.is_valid(raise_exception=True)
    job = serializer.save(
        spider=spider,
        status_data=status_data,
        expiration_date=expiration_date
    )

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
