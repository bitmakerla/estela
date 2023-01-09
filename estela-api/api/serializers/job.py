from rest_framework import serializers

from api import errors
from api.serializers.job_specific import (
    SpiderJobArgSerializer,
    SpiderJobEnvVarSerializer,
    SpiderJobTagSerializer,
)
from api.validators import JobRamLimitValidator
from config.job_manager import job_manager
from core.models import SpiderJob, SpiderJobArg, SpiderJobEnvVar, SpiderJobTag


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
            "limits",
        )


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
    limits = serializers.JSONField(
        required=False, help_text="Job limits.", validators=[JobRamLimitValidator()]
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
            "limits",
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
    allowed_status_to_stop = [
        SpiderJob.WAITING_STATUS,
        SpiderJob.RUNNING_STATUS,
    ]

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
                if not instance.status in self.allowed_status_to_stop:
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

        for field in [
            "lifespan",
            "total_response_bytes",
            "item_count",
            "request_count",
        ]:
            if not getattr(instance, field):
                new_value = validated_data.get(field, getattr(instance, field))
                setattr(instance, field, new_value)

        if (
            "data_status" in validated_data
            and instance.data_status != SpiderJob.DELETED_STATUS
        ):
            if data_status == SpiderJob.PERSISTENT_STATUS:
                instance.data_status = SpiderJob.PERSISTENT_STATUS
            elif data_status == SpiderJob.PENDING_STATUS:
                instance.data_status = SpiderJob.PENDING_STATUS
                if data_expiry_days < 1:
                    raise serializers.ValidationError(
                        {"error": errors.POSITIVE_SMALL_INTEGER_FIELD}
                    )
                else:
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
