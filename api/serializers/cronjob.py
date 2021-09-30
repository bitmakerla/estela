from rest_framework import serializers

from core.models import SpiderJobArg, SpiderJobEnvVar, SpiderCronJob

from api.serializers.arg import SpiderJobArgSerializer
from api.serializers.env_var import SpiderJobEnvVarSerializer


class SpiderCronJobSerializer(serializers.ModelSerializer):
    cjargs = SpiderJobArgSerializer(many=True, required=False)
    cjenv_vars = SpiderJobEnvVarSerializer(many=True, required=False)

    class Meta:
        model = SpiderCronJob
        fields = (
            "cjid",
            "spider",
            "created",
            "name",
            "cjargs",
            "cjenv_vars",
            "schedule",
            "status",
        )


class SpiderCronJobCreateSerializer(serializers.ModelSerializer):
    cjargs = SpiderJobArgSerializer(many=True, required=False)
    cjenv_vars = SpiderJobEnvVarSerializer(many=True, required=False)

    class Meta:
        model = SpiderCronJob
        fields = (
            "cjid",
            "name",
            "cjargs",
            "cjenv_vars",
            "schedule",
            "status",
        )

    def create(self, validated_data):
        args_data = validated_data.pop("cjargs", [])
        env_vars_data = validated_data.pop("cjenv_vars", [])

        cronjob = SpiderCronJob.objects.create(**validated_data)
        for arg in args_data:
            SpiderJobArg.objects.create(cronjob=cronjob, **arg)

        for env_var in env_vars_data:
            SpiderJobEnvVar.objects.create(cronjob=cronjob, **env_var)

        return cronjob
