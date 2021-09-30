import uuid
from datetime import timedelta
from django.conf import settings
from django.contrib.auth.models import User
from django.db import models
from django.utils import timezone
from urllib.parse import urlparse

from core.kubernetes import (
    read_job_status,
    JOB_TIME_CREATION,
    SINGLE_JOB,
    CRON_JOB,
)


class Project(models.Model):
    pid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=1000)
    users = models.ManyToManyField(User)

    @property
    def container_image(self):
        parsed_container_host = urlparse(settings.REGISTRY_HOST)
        container_image = "{}/{}:bm_{}".format(
            parsed_container_host.netloc,
            settings.REPOSITORY_NAME,
            self.pid,
        )
        return container_image


class Spider(models.Model):
    sid = models.AutoField(primary_key=True)
    name = models.CharField(max_length=1000)
    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name="spiders"
    )
    deleted = models.BooleanField(default=False)


class SpiderCronJob(models.Model):
    ACTIVE_STATUS = "ACTIVE"
    DISABLED_STATUS = "DISABLED"
    STATUS_OPTIONS = [
        (ACTIVE_STATUS, "Active"),
        (DISABLED_STATUS, "Disabled"),
    ]
    cjid = models.AutoField(primary_key=True)
    spider = models.ForeignKey(
        Spider, on_delete=models.CASCADE, related_name="cronjobs"
    )
    schedule = models.CharField(max_length=20, blank=True)
    status = models.CharField(
        max_length=16, choices=STATUS_OPTIONS, default=ACTIVE_STATUS
    )
    created = models.DateTimeField(auto_now_add=True, editable=False)

    class Meta:
        ordering = ["-created"]

    @property
    def name(self):
        return "spider-cjob-{}-{}".format(self.cjid, self.spider.project.pid)

    @property
    def key(self):
        return "{}.{}.{}".format(self.cjid, self.spider.sid, self.spider.project.pid)


class SpiderJob(models.Model):
    WAITING_STATUS = "WAITING"
    RUNNING_STATUS = "RUNNING"
    STOPPED_STATUS = "STOPPED"
    INCOMPLETE_STATUS = "INCOMPLETE"
    CANCELLED_STATUS = "CANCELLED"
    COMPLETED_STATUS = "COMPLETED"
    ERROR_STATUS = "ERROR"
    STATUS_OPTIONS = [
        (WAITING_STATUS, "Waiting"),
        (RUNNING_STATUS, "Running"),
        (STOPPED_STATUS, "Stopped"),
        (INCOMPLETE_STATUS, "Incomplete"),
        (CANCELLED_STATUS, "Cancelled"),
        (COMPLETED_STATUS, "Completed"),
        (ERROR_STATUS, "Error"),
    ]

    jid = models.AutoField(primary_key=True)
    spider = models.ForeignKey(Spider, on_delete=models.CASCADE, related_name="jobs")
    cronjob = models.ForeignKey(
        SpiderCronJob, on_delete=models.CASCADE, related_name="cronjobs", null=True
    )
    status = models.CharField(
        max_length=16, choices=STATUS_OPTIONS, default=WAITING_STATUS
    )
    created = models.DateTimeField(auto_now_add=True, editable=False)

    class Meta:
        ordering = ["created"]

    @property
    def name(self):
        return "spider-job-{}-{}".format(self.jid, self.spider.project.pid)

    @property
    def key(self):
        return "{}.{}.{}".format(self.jid, self.spider.sid, self.spider.project.pid)

    @property
    def job_status(self):
        if (
            self.status == self.WAITING_STATUS
            and timezone.now() - timedelta(seconds=JOB_TIME_CREATION) > self.created
        ):
            job_status = read_job_status(self.name, job_type=SINGLE_JOB)
            if job_status is None:
                self.status = self.ERROR_STATUS
                self.save()
            elif job_status.status.active is None:
                if job_status.status.succeeded is None:
                    self.status = self.ERROR_STATUS
                    self.save()
        return self.status


class SpiderJobArg(models.Model):
    aid = models.AutoField(primary_key=True)
    job = models.ForeignKey(
        SpiderJob, on_delete=models.CASCADE, related_name="args", null=True
    )
    cronjob = models.ForeignKey(
        SpiderCronJob, on_delete=models.CASCADE, related_name="cjargs", null=True
    )
    name = models.CharField(max_length=1000)
    value = models.CharField(max_length=1000)


class SpiderJobEnvVar(models.Model):
    evid = models.AutoField(primary_key=True)
    job = models.ForeignKey(
        SpiderJob, on_delete=models.CASCADE, related_name="env_vars", null=True
    )
    cronjob = models.ForeignKey(
        SpiderCronJob, on_delete=models.CASCADE, related_name="cjenv_vars", null=True
    )
    name = models.CharField(max_length=1000)
    value = models.CharField(max_length=1000)
