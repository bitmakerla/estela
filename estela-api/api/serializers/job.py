from rest_framework import serializers

from api import errors
from api.serializers.job_specific import (
    SpiderJobArgSerializer,
    SpiderJobEnvVarSerializer,
    SpiderJobTagSerializer,
)
from config.job_manager import job_manager
from core.models import (
    DataStatus,
    SpiderJob,
    SpiderJobArg,
    SpiderJobEnvVar,
    SpiderJobTag,
)


class SpiderJobSerializer(serializers.ModelSerializer):
    args = SpiderJobArgSerializer(many=True, required=False, help_text="Job arguments.")
    env_vars = SpiderJobEnvVarSerializer(
        many=True, required=False, help_text="Job env variables."
    )
    tags = SpiderJobTagSerializer(many=True, required=False, help_text="Job tags.")
    name = serializers.CharField(
        required=False, read_only=True, help_text="Unique job name."
    )
    job_status = serializers.CharField(
        required=False, read_only=True, help_text="Current job status."
    )
    spider = serializers.SerializerMethodField("get_spider")

    class Meta:
        model = SpiderJob
        fields = (
            "jid",
            "spider",
            "created",
            "name",
            "lifespan",
            "total_response_bytes",
            "item_count",
            "request_count",
            "args",
            "env_vars",
            "tags",
            "job_status",
            "cronjob",
            "data_expiry_days",
            "data_status",
        )

    def get_spider(self, instance):
        return {"sid": instance.spider.sid, "name": instance.spider.name}


class SpiderJobCreateSerializer(serializers.ModelSerializer):
    args = SpiderJobArgSerializer(many=True, required=False, help_text="Job arguments.")
    env_vars = SpiderJobEnvVarSerializer(
        many=True, required=False, help_text="Job env variables."
    )
    tags = SpiderJobTagSerializer(many=True, required=False, help_text="Job tags.")
    name = serializers.CharField(
        required=False, read_only=True, help_text="Unique job name."
    )
    job_status = serializers.CharField(
        required=False, read_only=True, help_text="Current job status."
    )
    data_status = serializers.CharField(required=True, help_text="Data status.")
    data_expiry_days = serializers.IntegerField(
        required=False, help_text="Days before data expires."
    )

    class Meta:
        model = SpiderJob
        fields = (
            "jid",
            "name",
            "args",
            "env_vars",
            "tags",
            "job_status",
            "cronjob",
            "data_expiry_days",
            "data_status",
        )

    def create(self, validated_data):
        args_data = validated_data.pop("args", [])
        env_vars_data = validated_data.pop("env_vars", [])
        tags_data = validated_data.pop("tags", [])

        job = SpiderJob.objects.create(**validated_data)
        for arg in args_data:
            SpiderJobArg.objects.create(job=job, **arg)

        for env_var in env_vars_data:
            SpiderJobEnvVar.objects.create(job=job, **env_var)

        for tag_data in tags_data:
            tag, _ = SpiderJobTag.objects.get_or_create(**tag_data)
            job.tags.add(tag)

        job.save()

        return job


class SpiderJobUpdateSerializer(serializers.ModelSerializer):
    data_status = serializers.ChoiceField(
        choices=DataStatus.JOB_LEVEL_OPTIONS,
        required=False,
        help_text="Job data status.",
    )
    data_expiry_days = serializers.IntegerField(
        required=False,
        help_text="Job data expiry days.",
    )

    allowed_status_to_stop = [
        SpiderJob.WAITING_STATUS,
        SpiderJob.RUNNING_STATUS,
    ]

    job_fields = ["lifespan", "total_response_bytes", "item_count", "request_count"]

    class Meta:
        model = SpiderJob
        fields = (
            "jid",
            "status",
            "lifespan",
            "total_response_bytes",
            "item_count",
            "request_count",
            "data_status",
            "data_expiry_days",
        )

    def update(self, instance, validated_data):
        status = validated_data.get("status", instance.status)
        data_status = validated_data.get("data_status", "")
        data_expiry_days = int(validated_data.get("data_expiry_days", 1))
        if status != instance.status:
            if instance.status == SpiderJob.STOPPED_STATUS:
                raise serializers.ValidationError({"error": "Job is stopped"})
            if status == SpiderJob.WAITING_STATUS:
                raise serializers.ValidationError({"error": "Invalid status"})
            if status == SpiderJob.STOPPED_STATUS:
                if instance.status not in self.allowed_status_to_stop:
                    raise serializers.ValidationError(
                        {
                            "error": errors.JOB_NOT_STOPPED.format(
                                *self.allowed_status_to_stop
                            )
                        }
                    )
                else:
                    job_manager.delete_job(instance.name)
            instance.status = status

        for field in self.job_fields:
            if not getattr(instance, field):
                new_value = validated_data.get(field, getattr(instance, field))
                setattr(instance, field, new_value)

        if (
            "data_status" in validated_data
            and instance.data_status != DataStatus.DELETED_STATUS
        ):
            instance.data_status = data_status
            if data_status == DataStatus.PENDING_STATUS and data_expiry_days > 0:
                instance.data_expiry_days = data_expiry_days
            else:
                raise serializers.ValidationError({"error": errors.INVALID_DATA_STATUS})

        instance.save()
        return instance


class DeleteJobDataSerializer(serializers.Serializer):
    count = serializers.IntegerField(required=True, help_text="Deleted items count.")


class ProjectJobSerializer(serializers.Serializer):
    results = SpiderJobSerializer(many=True, required=True, help_text="Project jobs.")
    count = serializers.IntegerField(required=True, help_text="Project jobs count.")
