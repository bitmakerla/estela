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
}
