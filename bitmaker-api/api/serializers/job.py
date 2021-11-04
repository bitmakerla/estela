from rest_framework import serializers

from api.serializers.job_specific import (
    SpiderJobArgSerializer,
    SpiderJobEnvVarSerializer,
    SpiderJobTagSerializer,
)
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
        )


class SpiderJobCreateSerializer(serializers.ModelSerializer):
    args = SpiderJobArgSerializer(many=True, required=False)
    env_vars = SpiderJobEnvVarSerializer(many=True, required=False)
    tags = SpiderJobTagSerializer(many=True, required=False)

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
    class Meta:
        model = SpiderJob
        fields = (
            "jid",
            "status",
        )
