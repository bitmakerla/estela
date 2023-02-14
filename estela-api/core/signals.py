from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

from core.tasks import get_chain_to_process_usage_data
from core.models import SpiderJob


@receiver(post_save, sender=SpiderJob, dispatch_uid="update_usage")
def update_usage(sender, instance, created, **kwargs):
    if instance.status == SpiderJob.COMPLETED_STATUS:
        chain_of_usage_process = get_chain_to_process_usage_data(job_id=instance.jid)
        chain_of_usage_process.apply_async(
            countdown=settings.COUNTDOWN_RECORD_PROJECT_USAGE_AFTER_JOB_EVENT
        )
