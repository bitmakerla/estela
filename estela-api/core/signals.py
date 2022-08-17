from django.db.models.signals import post_save
from django.dispatch import receiver

from core.tasks import record_project_usage_after_job_event
from core.models import SpiderJob


@receiver(post_save, sender=SpiderJob, dispatch_uid="update_usage")
def update_usage(sender, instance, created, **kwargs):
    if instance.status == SpiderJob.COMPLETED_STATUS:
        record_project_usage_after_job_event.s(instance.jid).apply_async(countdown=1800)
