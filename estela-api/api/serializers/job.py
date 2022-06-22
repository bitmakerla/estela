from rest_framework import serializers

from api import errors
from api.serializers.job_specific import (
    SpiderJobArgSerializer,
    SpiderJobEnvVarSerializer,
    SpiderJobTagSerializer,
)
from config.job_manager import job_manager
from core.models import SpiderJob, SpiderJobArg, SpiderJobEnvVar, SpiderJobTag


class SpiderJobSerializer(serializers.ModelSerializer):
    args = SpiderJobArgSerializer(many=True, required=False)
    env_vars = SpiderJobEnvVarSerializer(many=True, required=False)
    tags = SpiderJobTagSerializer(many=True, required=False)

    class Meta:
        model = SpiderJob
        fields = (
            "jid",
            "spider",
            "created",
            "name",
            "args",
            "env_vars",
            "tags",
            "job_status",
            "cronjob",
            "data_expiry_days",
            "data_status",
        )


class SpiderJobCreateSerializer(serializers.ModelSerializer):
    args = SpiderJobArgSerializer(many=True, required=False)
    env_vars = SpiderJobEnvVarSerializer(many=True, required=False)
    tags = SpiderJobTagSerializer(many=True, required=False)
    data_status = serializers.CharField(required=True)
    data_expiry_days = serializers.CharField(required=False)

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
    allowed_status_to_stop = [
        SpiderJob.WAITING_STATUS,
        SpiderJob.RUNNING_STATUS,
        SpiderJob.ERROR_STATUS,
    ]

    class Meta:
        model = SpiderJob
        fields = (
            "jid",
            "status",
            "data_status",
            "data_expiry_days",
        )

    def update(self, instance, validated_data):
        status = validated_data.get("status", instance.status)
        data_status = validated_data.get("data_status", "")
        data_expiry_days = validated_data.get("data_expiry_days", None)
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
        if "data_status" in validated_data:
            if data_status == SpiderJob.PERSISTENT_STATUS:
                instance.data_status = SpiderJob.PERSISTENT_STATUS
            else:
                instance.data_status = SpiderJob.PENDING_STATUS
                instance.data_expiry_days = int(data_expiry_days)

        instance.save()
        return instance


class GetLogsSerializer(serializers.Serializer):
    logs = serializers.ListField(
        child=serializers.CharField(max_length=1000), required=True
    )
    count = serializers.IntegerField(required=True)


class DeleteJobDataSerializer(serializers.Serializer):
    count = serializers.IntegerField(required=True)


class ProjectJobSerializer(serializers.Serializer):
    results = SpiderJobSerializer(many=True, required=True)
    count = serializers.IntegerField(required=True)
