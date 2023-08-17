from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

from core.models import SpiderJob
from core.tasks import get_chain_to_process_usage_data, record_job_coverage_event


@receiver(post_save, sender=SpiderJob, dispatch_uid="update_usage")
def update_usage(sender, instance: SpiderJob, created, **kwargs):
    if instance.status in [
        SpiderJob.COMPLETED_STATUS,
        SpiderJob.STOPPED_STATUS,
        SpiderJob.ERROR_STATUS,
    ]:
        chain_of_usage_process = get_chain_to_process_usage_data(job_id=instance.jid)
        chain_of_usage_process.apply_async(
            countdown=settings.COUNTDOWN_RECORD_PROJECT_USAGE_AFTER_JOB_EVENT
        )
        record_job_coverage_event.apply_async(
            args=[instance.jid],
            countdown=settings.COUNTDOWN_RECORD_COVERAGE_AFTER_JOB_EVENT,
        )
