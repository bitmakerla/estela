import os

from celery import Celery
from django.conf import settings

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.base")

# Initialize a new Celery application instance named "estela".
app = Celery("estela")

# Configure the Celery app to use Django settings with a specific namespace "CELERY".
# All Celery-related configurations are expected to be prefixed with "CELERY_" in Django settings.
app.config_from_object("django.conf:settings", namespace="CELERY")

# Autodiscover and load tasks from all installed Django apps.
# Celery will search for a `tasks.py` module in each Django app and register tasks found in them.
app.autodiscover_tasks()

# These tasks will be executed at regular intervals as specified by the "schedule" argument.
app.conf.beat_schedule = {
    # Task to run spider that are IN_QUEUE jobs every 2 minutes.
    "run-spider-jobs": {
        "task": "core.tasks.run_spider_jobs",
        "schedule": 120,
    },
    # Task to check and update job status errors every minute.
    "check-and-update-job-status-errors": {
        "task": "core.tasks.check_and_update_job_status_errors",
        "schedule": 60,
    },
    # Task to delete expired job data every hour.
    "delete-expired-jobs-data": {
        "task": "core.tasks.delete_expired_jobs_data",
        "schedule": 3600,
    },
}

# Dynamically import and update the beat schedule with periodic tasks from external applications.
# External apps are specified in the Django settings under CELERY_EXTERNAL_IMPORTS.
# Each external app must define its own Celery configuration and beat schedule.
for import_name in settings.CELERY_EXTERNAL_IMPORTS:
    # Import the Celery app configuration from the external application.
    module = __import__(f"{import_name}.celery", fromlist=["celery"])
    external_app = module.app

    # Merge the external app's beat schedule with the current Celery app's beat schedule.
    # This allows tasks from external apps to be included in the periodic task schedule.
    app.conf.beat_schedule.update(external_app.conf.beat_schedule)
