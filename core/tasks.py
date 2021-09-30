from ***REMOVED***.conf import settings
from config.celery import app as celery_app
from core.models import SpiderJob, Spider
from core.kubernetes import create_job, read_job_status
from api.serializers.job import SpiderJobCreateSerializer


@celery_app.task
def run_spider_jobs():
    jobs = SpiderJob.objects.filter(status=SpiderJob.WAITING_STATUS)[
        : settings.RUN_JOBS_PER_LOT
    ]

    for job in jobs:
        job_args = {arg.name: arg.value for arg in job.args.all()}
        job_env_vars = {env_var.name: env_var.value for env_var in job.env_vars.all()}
        create_job(
            job.name,
            job.key,
            job.spider.name,
            job_args,
            job_env_vars,
            job.spider.project.container_image,
        )


@celery_app.task(name="core.tasks.launch_job")
def launch_job(sid_, data_, token=None):
    spider = Spider.objects.get(sid=sid_)
    serializer = SpiderJobCreateSerializer(data=data_)

    serializer.is_valid(raise_exception=True)
    job = serializer.save(spider=spider)

    job_args = {arg.name: arg.value for arg in job.args.all()}
    job_env_vars = {env_var.nam: env_var.value for env_var in job.env_vars.all()}
    create_job(
        job.name,
        job.key,
        job.spider.name,
        job_args,
        job_env_vars,
        job.spider.project.container_image,
        auth_token=token,
    )


@celery_app.task
def check_and_update_job_status_errors():
    jobs = SpiderJob.objects.filter(status=SpiderJob.WAITING_STATUS)[
        : settings.CHECK_JOB_ERRORS_BATCH_SIZE
    ]

    for job in jobs:
        job_status = read_job_status(job.name)
        if job_status is None or (
            job_status.status.active is None and job_status.status.succeeded is None
        ):
            job.status = SpiderJob.ERROR_STATUS
            job.save()
