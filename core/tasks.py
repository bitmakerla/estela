from django.conf import settings
from config.celery import app as celery_app
from core.models import SpiderJob
from core.kubernetes import create_job, get_api_instance


@celery_app.task
def run_spider_jobs():
    jobs = SpiderJob.objects.filter(status=SpiderJob.WAITING_STATUS)[
        : settings.RUN_JOBS_PER_LOT
    ]
    api_instance = get_api_instance()

    for job in jobs:
        job_args = {arg.name: arg.value for arg in job.args.all()}
        create_job(
            job.name,
            job.spider.name,
            job_args,
            job.spider.project.container_image,
            api_instance=api_instance,
        )
        job.status = SpiderJob.RUNNING_STATUS
        job.save()
