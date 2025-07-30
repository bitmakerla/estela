import os

from celery import Celery
from django.conf import settings

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.base")

app = Celery("estela")
app.config_from_object("django.conf:settings", namespace="CELERY")

app.autodiscover_tasks()

app.conf.beat_schedule = {
    "run-spider-jobs": {
        "task": "core.tasks.run_spider_jobs",
        "schedule": 120,
    },
    "check-and-update-job-status-errors": {
        "task": "core.tasks.check_and_update_job_status_errors",
        "schedule": 60,
    },
    "delete-expired-jobs-data": {
        "task": "core.tasks.delete_expired_jobs_data",
        "schedule": 3600,
    },
    "update-mongodb-insertion-progress": {
        "task": "core.tasks.update_mongodb_insertion_progress",
        "schedule": 60,
    },
}


for import_name in settings.CELERY_EXTERNAL_IMPORTS:
    module = __import__(f"{import_name}.celery", fromlist=["celery"])
    external_app = module.app
    app.conf.beat_schedule.update(external_app.conf.beat_schedule)
