import uuid
from datetime import timedelta
from urllib.parse import urlparse

from config.job_manager import job_manager
from django.conf import settings
from django.contrib.auth.models import User
from django.db import models
from django.utils import timezone


class DataStatus:
    PERSISTENT_STATUS = "PERSISTENT"
    DELETED_STATUS = "DELETED"
    PENDING_STATUS = "PENDING"

    HIGH_LEVEL_OPTIONS = [
        (PERSISTENT_STATUS, "Persistent"),
        (PENDING_STATUS, "Pending"),
    ]
    JOB_LEVEL_OPTIONS = HIGH_LEVEL_OPTIONS + [(DELETED_STATUS, "Deleted")]


class Project(models.Model):
    NOT_ESPECIFIED = "NOT ESPECIFIED"
    E_COMMERCE = "E-COMMERCE"
    LOGISTICS = "LOGISTICS"
    FINANCE = "FINANCE"
    EDUCATIONAL = "EDUCATIONAL"
    TECHNOLOGY = "TECHNOLOGY"
    OTHER_CATEGORY = "OTHER_CATEGORY"
    CATEGORY_OPTIONS = [
        (NOT_ESPECIFIED, "Not specified"),
        (E_COMMERCE, "E-commerce"),
        (LOGISTICS, "Logistics"),
        (FINANCE, "Finance"),
        (EDUCATIONAL, "Educational"),
        (TECHNOLOGY, "Technology"),
        (OTHER_CATEGORY, "Other category"),
    ]
    PERSISTENT_STATUS = "PERSISTENT"
    PENDING_STATUS = "PENDING"
    pid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=1000)
    pid = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="A UUID identifying this project.",
    )
    name = models.CharField(max_length=1000, help_text="Project's name.")
    category = models.CharField(
        max_length=30,
        choices=CATEGORY_OPTIONS,
        default=OTHER_CATEGORY,
        help_text="Project's category.",
    )
    users = models.ManyToManyField(
        User, through="Permission", help_text="Users with permissions on this project."
    )
    data_status = models.CharField(
        max_length=20,
        choices=DataStatus.HIGH_LEVEL_OPTIONS,
        default=DataStatus.PERSISTENT_STATUS,
        help_text="Data status.",
    )
    data_expiry_days = models.PositiveSmallIntegerField(
        default=1, help_text="Days before data is deleted."
    )
    deleted = models.BooleanField(
        default=False, help_text="Whether the project was deleted."
    )

    @property
    def container_image(self):
        parsed_container_host = urlparse(settings.REGISTRY_HOST)
        container_image = "{}/{}:estela_{}".format(
            parsed_container_host.netloc or settings.REGISTRY_HOST,
            settings.REPOSITORY_NAME,
            self.pid,
        )
        return container_image


class Permission(models.Model):
    OWNER_PERMISSION = "OWNER"
    ADMIN_PERMISSION = "ADMIN"
    DEVELOPER_PERMISSION = "DEVELOPER"
    VIEWER_PERMISSION = "VIEWER"
    PERMISSIONS_OPTIONS = [
        (OWNER_PERMISSION, "Owner"),
        (ADMIN_PERMISSION, "Admin"),
        (DEVELOPER_PERMISSION, "Developer"),
        (VIEWER_PERMISSION, "Viewer"),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, help_text="User.")
    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, help_text="Project UUID."
    )
    permission = models.CharField(
        max_length=16,
        choices=PERMISSIONS_OPTIONS,
        default=VIEWER_PERMISSION,
        help_text="Permission on this project.",
    )


class Spider(models.Model):
    sid = models.AutoField(
        primary_key=True, help_text="A unique integer value identifying this spider."
    )
    name = models.CharField(max_length=1000, help_text="Spider's name.")
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="spiders",
        help_text="Project UUID.",
    )
    data_status = models.CharField(
        max_length=20,
        choices=DataStatus.HIGH_LEVEL_OPTIONS,
        default=DataStatus.PERSISTENT_STATUS,
        help_text="Data status.",
    )
    data_expiry_days = models.PositiveSmallIntegerField(
        default=1, help_text="Days before data is deleted."
    )
    deleted = models.BooleanField(
        default=False, help_text="True if the spider has been deleted."
    )


class Deploy(models.Model):
    SUCCESS_STATUS = "SUCCESS"
    BUILDING_STATUS = "BUILDING"
    FAILURE_STATUS = "FAILURE"
    CANCELED_STATUS = "CANCELED"
    STATUS_OPTIONS = [
        (SUCCESS_STATUS, "Success"),
        (BUILDING_STATUS, "Building"),
        (FAILURE_STATUS, "Failure"),
        (CANCELED_STATUS, "Canceled"),
    ]
    did = models.AutoField(
        primary_key=True, help_text="A unique integer value identifying this deploy."
    )
    created = models.DateTimeField(
        auto_now_add=True, editable=False, help_text="Deploy creation date."
    )
    spiders = models.ManyToManyField(Spider, help_text="Spiders in this deploy.")
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, help_text="User who performed the deploy."
    )
    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, help_text="Project UUID."
    )
    status = models.CharField(
        max_length=12,
        choices=STATUS_OPTIONS,
        default=BUILDING_STATUS,
        help_text="Deploy status.",
    )

    class Meta:
        ordering = ["-created"]


class SpiderCronJob(models.Model):
    ACTIVE_STATUS = "ACTIVE"
    DISABLED_STATUS = "DISABLED"
    STATUS_OPTIONS = [
        (ACTIVE_STATUS, "Active"),
        (DISABLED_STATUS, "Disabled"),
    ]

    cjid = models.AutoField(
        primary_key=True, help_text="A unique integer value identifying this cron job."
    )
    spider = models.ForeignKey(
        Spider,
        on_delete=models.CASCADE,
        related_name="cronjobs",
        help_text="Spider sid.",
    )
    schedule = models.CharField(
        max_length=20, blank=True, help_text="Cron job schedule definition."
    )
    status = models.CharField(
        max_length=16,
        choices=STATUS_OPTIONS,
        default=ACTIVE_STATUS,
        help_text="Cron job status.",
    )
    created = models.DateTimeField(
        auto_now_add=True, editable=False, help_text="Cron job creation date."
    )
    unique_collection = models.BooleanField(
        default=False,
        help_text="True if this cron job stores its items in a unique collection.",
    )
    data_status = models.CharField(
        max_length=20,
        choices=DataStatus.HIGH_LEVEL_OPTIONS,
        default=DataStatus.PERSISTENT_STATUS,
        help_text="Data status.",
    )
    data_expiry_days = models.PositiveSmallIntegerField(
        null=True, help_text="Days before data is deleted."
    )
    deleted = models.BooleanField(
        default=False, help_text="Whether the Cronjob has been deleted."
    )

    class Meta:
        ordering = ["-created"]

    @property
    def name(self):
        return "scj-{}-{}-{}".format(
            self.cjid, self.spider.sid, self.spider.project.pid
        )

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
    IN_QUEUE_STATUS = "IN_QUEUE"
    ERROR_STATUS = "ERROR"
    STATUS_OPTIONS = [
        (IN_QUEUE_STATUS, "In queue"),
        (WAITING_STATUS, "Waiting"),
        (RUNNING_STATUS, "Running"),
        (STOPPED_STATUS, "Stopped"),
        (INCOMPLETE_STATUS, "Incomplete"),
        (CANCELLED_STATUS, "Cancelled"),
        (COMPLETED_STATUS, "Completed"),
        (ERROR_STATUS, "Error"),
    ]

    jid = models.AutoField(
        primary_key=True, help_text="A unique integer value identifying this job."
    )
    spider = models.ForeignKey(
        Spider, on_delete=models.CASCADE, related_name="jobs", help_text="Spider sid."
    )
    cronjob = models.ForeignKey(
        SpiderCronJob,
        on_delete=models.CASCADE,
        related_name="jobs",
        null=True,
        help_text="Related cron job.",
    )
    status = models.CharField(
        max_length=16,
        choices=STATUS_OPTIONS,
        default=WAITING_STATUS,
        help_text="Job status.",
    )
    data_status = models.CharField(
        max_length=20,
        choices=DataStatus.JOB_LEVEL_OPTIONS,
        default=DataStatus.PERSISTENT_STATUS,
        help_text="Data status.",
    )
    data_expiry_days = models.PositiveSmallIntegerField(
        null=True, help_text="Days before data is deleted."
    )
    created = models.DateTimeField(
        auto_now_add=True, editable=False, help_text="Job creation date."
    )
    lifespan = models.DurationField(
        default=timedelta(0),
        help_text="The elapsed seconds the spider job was running.",
    )
    total_response_bytes = models.PositiveBigIntegerField(
        default=0, help_text="The total bytes received in responses."
    )
    item_count = models.PositiveBigIntegerField(
        default=0, help_text="The number of items extracted in the job."
    )
    request_count = models.PositiveBigIntegerField(
        default=0, help_text="The number of requests made by the spider job."
    )

    class Meta:
        ordering = ["-created"]

    @property
    def name(self):
        return "sj-{}-{}".format(self.jid, self.spider.project.pid)

    @property
    def key(self):
        return "{}.{}.{}".format(self.jid, self.spider.sid, self.spider.project.pid)

    @property
    def job_status(self):
        if (
            self.status == self.WAITING_STATUS
            and timezone.now() - timedelta(seconds=job_manager.JOB_TIME_CREATION)
            > self.created
        ):
            job_status = job_manager.read_job_status(self.name)
            if job_status is None:
                self.status = self.ERROR_STATUS
                self.save()
            elif job_status.active is None:
                if job_status.succeeded is None:
                    self.status = self.ERROR_STATUS
                    self.save()
        return self.status


class SpiderJobArg(models.Model):
    aid = models.AutoField(
        primary_key=True,
        help_text="A unique integer value identifying this job argument.",
    )
    job = models.ForeignKey(
        SpiderJob,
        on_delete=models.CASCADE,
        related_name="args",
        null=True,
        help_text="Job jid.",
    )
    cronjob = models.ForeignKey(
        SpiderCronJob,
        on_delete=models.CASCADE,
        related_name="cargs",
        null=True,
        help_text="Cron job cjid.",
    )
    name = models.CharField(max_length=1000, help_text="Argument name.")
    value = models.CharField(max_length=1000, help_text="Argument value.")


class SpiderJobEnvVar(models.Model):
    evid = models.AutoField(
        primary_key=True,
        help_text="A unique integer value identifying this job env variable.",
    )
    job = models.ForeignKey(
        SpiderJob,
        on_delete=models.CASCADE,
        related_name="env_vars",
        null=True,
        help_text="Job jid.",
    )
    cronjob = models.ForeignKey(
        SpiderCronJob,
        on_delete=models.CASCADE,
        related_name="cenv_vars",
        null=True,
        help_text="Cron job cjid.",
    )
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="env_vars",
        null=True,
        help_text="Project pid.",
    )
    spider = models.ForeignKey(
        Spider,
        on_delete=models.CASCADE,
        related_name="env_vars",
        null=True,
        help_text="Spider sid.",
    )
    name = models.CharField(max_length=1000, help_text="Env variable name.")
    value = models.CharField(max_length=1000, help_text="Env variable value.")
    masked = models.BooleanField(
        default=False, help_text="Whether the env variable value is masked."
    )


class SpiderJobTag(models.Model):
    tid = models.AutoField(
        primary_key=True, help_text="A unique integer value identifying this tag."
    )
    name = models.CharField(max_length=50, help_text="Tag name.")
    jobs = models.ManyToManyField(
        SpiderJob,
        related_name="tags",
        blank=True,
        help_text="Related jobs to this tag.",
    )
    cronjobs = models.ManyToManyField(
        SpiderCronJob,
        related_name="ctags",
        blank=True,
        help_text="Related cron jobs to this tag.",
    )


class UsageRecord(models.Model):
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        help_text="Project to which the usage record corresponds.",
    )
    created_at = models.DateTimeField(
        auto_now_add=True, editable=False, help_text="Usage record creation date."
    )
    processing_time = models.DurationField(help_text="Time of CPU use.")
    network_usage = models.PositiveBigIntegerField(
        help_text="Amount of network bytes used."
    )
    item_count = models.PositiveBigIntegerField(help_text="Amount of items extracted.")
    request_count = models.PositiveBigIntegerField(help_text="Amount of requests made.")
    items_data_size = models.PositiveBigIntegerField(
        help_text="Amount in bytes occupied by items in the database"
    )
    requests_data_size = models.PositiveBigIntegerField(
        help_text="Amount in bytes occupied by requests in the database"
    )
    logs_data_size = models.PositiveBigIntegerField(
        help_text="Amount in bytes occupied by logs in the database"
    )

    class Meta:
        ordering = ["-created_at"]
