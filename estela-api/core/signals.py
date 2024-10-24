from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

from core.models import SpiderJob
from core.tasks import get_chain_to_process_usage_data, record_job_coverage_event


@receiver(post_save, sender=SpiderJob, dispatch_uid="update_usage")
def update_usage(sender, instance: SpiderJob, created, **kwargs):
    """
    Signal receiver that triggers after a SpiderJob instance is saved/updated.
    When the status of the SpiderJob is one of COMPLETED, STOPPED, or ERROR,
    this function initiates asynchronous tasks to process usage data and record job coverage.

    Args:
        sender (Model): The model class that sent the signal (SpiderJob).
        instance (SpiderJob): The specific SpiderJob instance that was saved.
        created (bool): Whether this instance was newly created.
        **kwargs: Additional keyword arguments provided by the signal.

    Functionality:
        1. If the SpiderJob instance has a status of COMPLETED, STOPPED, or ERROR, it triggers two asynchronous tasks:
           - A task chain to process usage data using `get_chain_to_process_usage_data`.
           - A task to record the job's field coverage using `record_job_coverage_event`.
        2. Both tasks are scheduled to run after a delay specified in the Django settings.
           - The delay for processing usage data is controlled by `settings.COUNTDOWN_RECORD_PROJECT_USAGE_AFTER_JOB_EVENT`.
           - The delay for recording job coverage is controlled by `settings.COUNTDOWN_RECORD_COVERAGE_AFTER_JOB_EVENT`.
    """
    # Check if the SpiderJob status is either COMPLETED, STOPPED, or ERROR
    if instance.status in [
        SpiderJob.COMPLETED_STATUS,
        SpiderJob.STOPPED_STATUS,
        SpiderJob.ERROR_STATUS,
    ]:
        # Initiate the task chain to process usage data after the job event
        chain_of_usage_process = get_chain_to_process_usage_data(job_id=instance.jid)
        chain_of_usage_process.apply_async(
            countdown=settings.COUNTDOWN_RECORD_PROJECT_USAGE_AFTER_JOB_EVENT
        )

        # Schedule the task to record job coverage statistics
        record_job_coverage_event.apply_async(
            args=[instance.jid],
            countdown=settings.COUNTDOWN_RECORD_COVERAGE_AFTER_JOB_EVENT,
        )
