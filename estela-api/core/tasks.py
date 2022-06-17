from datetime import timedelta
from django.conf import settings
from config.celery import app as celery_app
from django.utils import timezone
from core.models import SpiderJob, Spider
from core.database_adapters import get_database_interface
from config.job_manager import job_manager
from rest_framework.authtoken.models import Token

from api.serializers.job import SpiderJobCreateSerializer


def get_default_token(job):
    user = job.spider.project.users.first()
    if not user:
        return None
    token, _ = Token.objects.get_or_create(user=user)
    return token.key


def delete_data(pid, sid, jid, data_type):
    client = get_database_interface()
    client.get_connection()
    job = SpiderJob.objects.filter.get(jid=jid)
    if (
        job.cronjob is not None
        and job.cronjob.unique_collection
        and data_type == "items"
    ):
        job_collection_name = "{}-scj{}-job_{}".format(
            sid, job.cronjob.cjid, data_type
        )
    else:
        job_collection_name = "{}-{}-job_{}".format(
            sid, jid, data_type
        )
    client.delete_collection_data(pid, job_collection_name)



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
    jobs = SpiderJob.objects.filter(data_status=SpiderJob.NON_DELETED_STATUS)[
        : settings.RUN_TASKS_PER_LOT
    ]

    for job in jobs:
        jid, sid, pid = job.key.split(".")
        months, days = [int(i) for i in job.data_expiry_date.split("/")]
        if timezone.now() - timedelta(days=(months * 30 + days)) > job.created:
            delete_data(pid, sid, jid, "items")
            delete_data(pid, sid, jid, "requests")
            job.data_status = SpiderJob.DELETED_STATUS
            job.save()


@celery_app.task(name="core.tasks.launch_job")
def launch_job(sid_, data_, data_expiry_date=None,token=None):
    spider = Spider.objects.get(sid=sid_)
    serializer = SpiderJobCreateSerializer(data=data_)

    if data_expiry_date is None:
        data_status = SpiderJob.PERSISTENT_STATUS
    else:
        data_status = SpiderJob.NON_DELETED_STATUS

    serializer.is_valid(raise_exception=True)
    job = serializer.save(
        spider=spider,
        data_status=data_status,
        data_expiry_date=data_expiry_date
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
