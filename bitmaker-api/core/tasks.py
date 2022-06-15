from datetime import timedelta

from api.serializers.job import SpiderJobCreateSerializer
from config.celery import app as celery_app
from config.job_manager import job_manager
from core.models import Project, Spider, SpiderJob, UsageRecord
from core.mongo import get_database_size
from django.conf import settings
from django.db.models import Sum
from rest_framework.authtoken.models import Token


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


@celery_app.task(name="core.tasks.launch_job")
def launch_job(sid_, data_, token=None):
    spider = Spider.objects.get(sid=sid_)
    serializer = SpiderJobCreateSerializer(data=data_)

    serializer.is_valid(raise_exception=True)
    job = serializer.save(spider=spider)

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


@celery_app.task(name="core.tasks.record_projects_usage")
def record_projects_usage():
    projects = Project.objects.all()

    for project in projects:
        project_jobs = SpiderJob.objects.filter(spider__project=project)

        total_processing_time = project_jobs.aggregate(Sum("lifespan"))[
            "lifespan__sum"
        ] or timedelta(0)
        total_network_usage = (
            project_jobs.aggregate(Sum("total_response_bytes"))[
                "total_response_bytes__sum"
            ]
            or 0
        )
        items_data_size = get_database_size(project, "items")
        requests_data_size = get_database_size(project, "requests")

        usage_record = UsageRecord.objects.create(
            project=project,
            processing_time=total_processing_time,
            network_usage=total_network_usage,
            items_data_size=items_data_size,
            requests_data_size=requests_data_size,
        )
