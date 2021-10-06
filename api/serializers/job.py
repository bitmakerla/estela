from rest_framework import serializers

from api.serializers.arg import SpiderJobArgSerializer
from api.serializers.env_var import SpiderJobEnvVarSerializer
from core.models import SpiderJob, SpiderJobArg, SpiderJobEnvVar


class SpiderJobSerializer(serializers.ModelSerializer):
    args = SpiderJobArgSerializer(many=True, required=False)
    env_vars = SpiderJobEnvVarSerializer(many=True, required=False)

    class Meta:
        model = SpiderJob
        fields = (
            "jid",
            "spider",
            "created",
            "name",
            "args",
            "env_vars",
            "job_status",
            "cronjob",
        )


class SpiderJobCreateSerializer(serializers.ModelSerializer):
    args = SpiderJobArgSerializer(many=True, required=False)
    env_vars = SpiderJobEnvVarSerializer(many=True, required=False)

    class Meta:
        model = SpiderJob
        fields = (
            "jid",
            "name",
            "args",
            "env_vars",
            "job_status",
            "cronjob",
        )

    def create(self, validated_data):
        args_data = validated_data.pop("args", [])
        env_vars_data = validated_data.pop("env_vars", [])

        job = SpiderJob.objects.create(**validated_data)
        for arg in args_data:
            SpiderJobArg.objects.create(job=job, **arg)

        for env_var in env_vars_data:
            SpiderJobEnvVar.objects.create(job=job, **env_var)

        return job


class SpiderJobUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SpiderJob
        fields = (
            "jid",
            "status",
        )
