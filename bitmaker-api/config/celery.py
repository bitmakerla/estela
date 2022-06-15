import os

from celery import Celery


os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.base")

app = Celery("bitmaker")
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
    "record-projects-usage": {
        "task": "core.tasks.record_projects_usage",
        "schedule": 3600,
    },
}
