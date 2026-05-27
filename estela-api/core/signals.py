import logging

from django.conf import settings
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

from core.cronjob import disable_cronjob
from core.models import Spider, SpiderCronJob, SpiderJob, UserProfile
from core.tasks import get_chain_to_process_usage_data, record_job_coverage_event

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Spider, dispatch_uid="disable_cronjobs_on_spider_delete")
def disable_cronjobs_on_spider_delete(sender, instance, **kwargs):

    if not instance.deleted:
        return

    cronjobs = list(instance.cronjobs.filter(deleted=False, status=SpiderCronJob.ACTIVE_STATUS))
    if not cronjobs:
        return

    logger.info(
        "Spider %s (sid=%s) marked deleted — disabling %d active cronjob(s)",
        instance.name,
        instance.sid,
        len(cronjobs),
    )
    for cronjob in cronjobs:
        disable_cronjob(cronjob.name)
        cronjob.status = SpiderCronJob.DISABLED_STATUS
        cronjob.save()
    logger.info("Done disabling cronjobs for spider %s (sid=%s)", instance.name, instance.sid)


@receiver(post_save, sender=User, dispatch_uid="create_user_profile")
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.get_or_create(
            user=instance,
            defaults={"memory_quota": settings.DEFAULT_USER_MEMORY_QUOTA},
        )


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
