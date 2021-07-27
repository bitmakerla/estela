from ***REMOVED***.conf import settings
from config.celery import app as celery_app
from core.models import SpiderJob
from core.kubernetes import create_job


@celery_app.task
def run_spider_jobs():
    jobs = SpiderJob.objects.filter(status=SpiderJob.WAITING_STATUS)[
        : settings.RUN_JOBS_PER_LOT
    ]

    for job in jobs:
        job_args = {arg.name: arg.value for arg in job.args.all()}
        create_job(
            job.name,
            job.key,
            job.spider.name,
            job_args,
            job.spider.project.container_image,
            job.job_type,
            schedule=job.schedule,
        )
        job.status = SpiderJob.RUNNING_STATUS
        job.save()
