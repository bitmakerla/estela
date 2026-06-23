import logging

from django.conf import settings
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

from django.utils import timezone

from core.cronjob import disable_cronjob
from core.models import Deploy, Project, Spider, SpiderCronJob, SpiderJob, UserProfile
from core.tasks import get_chain_to_process_usage_data, record_job_coverage_event

logger = logging.getLogger(__name__)


@receiver(post_save, sender=SpiderJob, dispatch_uid="update_project_last_modified_on_job")
def update_project_last_modified_on_job(sender, instance, **kwargs):
    Project.objects.filter(pid=instance.spider.project_id).update(last_modified=timezone.now())


@receiver(post_save, sender=Deploy, dispatch_uid="update_project_last_modified_on_deploy")
def update_project_last_modified_on_deploy(sender, instance, **kwargs):
    project_ids = instance.spiders.values_list("project_id", flat=True).distinct()
    Project.objects.filter(pid__in=project_ids).update(last_modified=timezone.now())


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
