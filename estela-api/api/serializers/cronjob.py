from croniter import croniter
from rest_framework import serializers

from api import errors
from api.mixins import NotificationsHandlerMixin

from api.mixins import ActivityHandler
from api.serializers.job_specific import (
    SpiderJobArgSerializer,
    SpiderJobEnvVarSerializer,
    SpiderJobTagSerializer,
)
from core.cronjob import disable_cronjob, enable_cronjob, update_schedule
from core.models import (
    DataStatus,
    SpiderCronJob,
    SpiderJobArg,
    SpiderJobEnvVar,
    SpiderJobTag,
)


class SpiderCronJobSerializer(serializers.ModelSerializer):
    cargs = SpiderJobArgSerializer(
        many=True, required=False, help_text="Cron job arguments."
    )
    cenv_vars = SpiderJobEnvVarSerializer(
        many=True, required=False, help_text="Cron job env variables."
    )
    ctags = SpiderJobTagSerializer(
        many=True, required=False, help_text="Cron job tags."
    )
    name = serializers.CharField(
        required=False, read_only=True, help_text="Unique cron job name."
    )

    class Meta:
        model = SpiderCronJob
        fields = (
            "cjid",
            "spider",
            "created",
            "name",
            "cargs",
            "cenv_vars",
            "ctags",
            "schedule",
            "status",
            "unique_collection",
            "data_status",
            "data_expiry_days",
        )


class SpiderCronJobCreateSerializer(serializers.ModelSerializer):
    cargs = SpiderJobArgSerializer(
        many=True, required=False, help_text="Cron job arguments."
    )
    cenv_vars = SpiderJobEnvVarSerializer(
        many=True, required=False, help_text="Cron job env variables."
    )
    ctags = SpiderJobTagSerializer(
        many=True, required=False, help_text="Cron job tags."
    )
    data_status = serializers.ChoiceField(
        choices=DataStatus.JOB_LEVEL_OPTIONS, required=True, help_text="Data status."
    )
    data_expiry_days = serializers.IntegerField(
        required=True, help_text="Days before data expires."
    )
    name = serializers.CharField(
        required=False, read_only=True, help_text="Unique cron job name."
    )

    def validate(self, attrs):
        attrs = super(SpiderCronJobCreateSerializer, self).validate(attrs)
        if not croniter.is_valid(attrs.get("schedule", "")):
            raise serializers.ValidationError(
                {"schedule": "Value is not a valid cron schedule."}
            )
        return attrs

    class Meta:
        model = SpiderCronJob
        fields = (
            "cjid",
            "name",
            "cargs",
            "cenv_vars",
            "ctags",
            "schedule",
            "unique_collection",
            "data_expiry_days",
            "data_status",
        )

    def create(self, validated_data):
        args_data = validated_data.pop("cargs", [])
        env_vars_data = validated_data.pop("cenv_vars", [])
        tags_data = validated_data.pop("ctags", [])

        cronjob = SpiderCronJob.objects.create(**validated_data)
        for arg in args_data:
            SpiderJobArg.objects.create(cronjob=cronjob, **arg)

        for env_var in env_vars_data:
            SpiderJobEnvVar.objects.create(cronjob=cronjob, **env_var)

        for tag_data in tags_data:
            tag, _ = SpiderJobTag.objects.get_or_create(**tag_data)
            cronjob.ctags.add(tag)

        cronjob.save()

        return cronjob


class SpiderCronJobUpdateSerializer(
    serializers.ModelSerializer,
    NotificationsHandlerMixin,
    ActivityHandler,
):
    def validate(self, attrs):
        attrs = super(SpiderCronJobUpdateSerializer, self).validate(attrs)
        if "schedule" in attrs and not croniter.is_valid(attrs.get("schedule")):
            raise serializers.ValidationError(
                {"schedule": "Value is not a valid cron schedule."}
            )
        return attrs

    class Meta:
        model = SpiderCronJob
        fields = (
            "cjid",
            "status",
            "schedule",
            "unique_collection",
            "data_status",
            "data_expiry_days",
        )

    def update(self, instance, validated_data):
        user = instance["user"]
        instance = instance["object"]
        status = validated_data.get("status", "")
        schedule = validated_data.get("schedule", "")
        unique_collection = validated_data.get("unique_collection", False)
        data_status = validated_data.get("data_status", "")
        data_expiry_days = int(validated_data.get("data_expiry_days", 1))
        name = instance.name
        message = ""
        if "schedule" in validated_data:
            instance.schedule = schedule
            update_schedule(name, schedule)
            message = f"changed the schedule of Scheduled-job-{instance.cjid}."
        description = ""
        if "schedule" in validated_data:
            instance.schedule = schedule
            update_schedule(name, schedule)
            description = (f"Updated schedule of Schedule-Job-{instance.cjid}",)
        if "status" in validated_data:
            instance.status = status
            if status == SpiderCronJob.ACTIVE_STATUS:
                enable_cronjob(name)
                message = f"enabled Scheduled-job-{instance.cjid}."
            elif status == SpiderCronJob.DISABLED_STATUS:
                disable_cronjob(name)
                message = f"disabled Scheduled-job-{instance.cjid}."
        if "unique_collection" in validated_data:
            instance.unique_collection = unique_collection
        if "data_status" in validated_data:
            if data_status == DataStatus.PERSISTENT_STATUS:
                instance.data_status = DataStatus.PERSISTENT_STATUS
                message = f"changed data persistence of Scheduled-job-{instance.cjid} to persistent."
            elif data_status == DataStatus.PENDING_STATUS and data_expiry_days > 0:
                instance.data_status = DataStatus.PENDING_STATUS
                instance.data_expiry_days = data_expiry_days
                message = f"changed data persistence of Scheduled-job-{instance.cjid} to {data_expiry_days} days."
                description = f"Enabled schedule-job {instance.cjid}"
            elif status == SpiderCronJob.DISABLED_STATUS:
                disable_cronjob(name)
                description = f"Disabled schedule-job {instance.cjid}"

                description = f"Enabled Schedule-Job-{instance.cjid}"
            elif status == SpiderCronJob.DISABLED_STATUS:
                disable_cronjob(name)
                description = f"Disabled Schedule-Job-{instance.cjid}"

        if "unique_collection" in validated_data:
            instance.unique_collection = unique_collection
        if "data_status" in validated_data:
            if data_status == DataStatus.PERSISTENT_STATUS:
                instance.data_status = DataStatus.PERSISTENT_STATUS
                description = (
                    f"Set data status of Schedule-Job-{instance.cjid} to persistent"
                )
            elif data_status == DataStatus.PENDING_STATUS and data_expiry_days > 0:
                instance.data_status = DataStatus.PENDING_STATUS
                instance.data_expiry_days = data_expiry_days
                description = (
                    f"Set data status of Schedule-Job-{instance.cjid} to {data_expiry_days} days"
                )
            else:
                raise serializers.ValidationError({"error": errors.INVALID_DATA_STATUS})
        self.save_activity(
            user=user,
            project=instance.spider.project,
            description=description,
        )

        self.save_notification(
            user=user,
            message=message,
            project=instance.spider.project,
        )
        instance.save()
        return instance


class ProjectCronJobSerializer(serializers.Serializer):
    results = SpiderCronJobSerializer(
        many=True, required=True, help_text="Project Cronjobs."
    )
    count = serializers.IntegerField(required=True, help_text="Project cronjobs count.")
