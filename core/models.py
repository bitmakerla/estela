import uuid
from datetime import timedelta
from ***REMOVED***.conf import settings
from ***REMOVED***.contrib.auth.models import User
from ***REMOVED***.db import models
from ***REMOVED***.utils import timezone
from urllib.parse import urlparse

from core.kubernetes import read_job_status, JOB_TIME_CREATION, SINGLE_JOB, CRON_JOB


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

    TYPE_OPTIONS = [
        (SINGLE_JOB, "SingleJob"),
        (CRON_JOB, "CronJob"),
    ]

    jid = models.AutoField(primary_key=True)
    spider = models.ForeignKey(Spider, on_delete=models.CASCADE, related_name="jobs")
    status = models.CharField(
        max_length=16, choices=STATUS_OPTIONS, default=WAITING_STATUS
    )
    job_type = models.CharField(max_length=16, choices=TYPE_OPTIONS, default=SINGLE_JOB)
    created = models.DateTimeField(auto_now_add=True, editable=False)
    schedule = models.CharField(max_length=20, blank=True)

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
            job_status = read_job_status(self.name, job_type=self.job_type)
            if job_status is None:
                self.status = self.ERROR_STATUS
                self.save()
            elif (
                job_status.status.active is None and job_status.status.succeeded is None
            ):
                self.status = self.ERROR_STATUS
                self.save()
        return self.status


class SpiderJobArg(models.Model):
    aid = models.AutoField(primary_key=True)
    job = models.ForeignKey(SpiderJob, on_delete=models.CASCADE, related_name="args")
    name = models.CharField(max_length=1000)
    value = models.CharField(max_length=1000)
