from django.conf import settings
from django.db import transaction

from core.models import Deploy, Resource, SpiderJob
from estela_resources import ResourceKind, ResourcePhase


def _dual_write_enabled():
    return getattr(settings, "RESOURCE_DUAL_WRITE", False)


def _spider_job_resource_phase(job: SpiderJob) -> ResourcePhase:
    if job.status == SpiderJob.IN_QUEUE_STATUS:
        return ResourcePhase.PENDING
    if job.status == SpiderJob.WAITING_STATUS:
        return ResourcePhase.PROVISIONING
    return ResourcePhase.PENDING


def _deploy_resource_phase(deploy: Deploy) -> ResourcePhase:
    if deploy.status == Deploy.BUILDING_STATUS:
        return ResourcePhase.PROVISIONING
    return ResourcePhase.PENDING


def attach_spider_job_resource(job: SpiderJob) -> None:
    if not _dual_write_enabled():
        return
    if job.resource_id:
        return
    with transaction.atomic():
        locked = SpiderJob.objects.select_for_update().get(pk=job.pk)
        if locked.resource_id:
            return
        resource = Resource.objects.create(
            project=locked.spider.project,
            kind=ResourceKind.SPIDER_JOB,
            phase=_spider_job_resource_phase(locked),
            desired_spec={"jid": locked.jid},
            observed_state={},
            external_ref={},
        )
        locked.resource = resource
        locked.save(update_fields=["resource"])


def attach_deploy_resource(deploy):
    if not _dual_write_enabled():
        return
    if deploy.resource_id:
        return
    with transaction.atomic():
        locked = Deploy.objects.select_for_update().get(pk=deploy.pk)
        if locked.resource_id:
            return
        resource = Resource.objects.create(
            project=locked.project,
            kind=ResourceKind.PROJECT_DEPLOY,
            phase=_deploy_resource_phase(locked),
            desired_spec={"did": locked.did},
            observed_state={},
            external_ref={},
        )
        locked.resource = resource
        locked.save(update_fields=["resource"])
