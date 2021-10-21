from croniter import croniter
from rest_framework import serializers

from core.models import SpiderJobArg, SpiderJobEnvVar, SpiderCronJob

from api.serializers.arg import SpiderJobArgSerializer
from api.serializers.env_var import SpiderJobEnvVarSerializer
from core.cronjob import enable_cronjob, disable_cronjob, update_schedule


class SpiderCronJobSerializer(serializers.ModelSerializer):
    cargs = SpiderJobArgSerializer(many=True, required=False)
    cenv_vars = SpiderJobEnvVarSerializer(many=True, required=False)

    class Meta:
        model = SpiderCronJob
        fields = (
            "cjid",
            "spider",
            "created",
            "name",
            "cargs",
            "cenv_vars",
            "schedule",
            "status",
        )


class SpiderCronJobCreateSerializer(serializers.ModelSerializer):
    cargs = SpiderJobArgSerializer(many=True, required=False)
    cenv_vars = SpiderJobEnvVarSerializer(many=True, required=False)

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
            "cargs",
            "cenv_vars",
            "schedule",
        )

    def create(self, validated_data):
        args_data = validated_data.pop("cargs", [])
        env_vars_data = validated_data.pop("cenv_vars", [])

        cronjob = SpiderCronJob.objects.create(**validated_data)
        for arg in args_data:
            SpiderJobArg.objects.create(cronjob=cronjob, **arg)

        for env_var in env_vars_data:
            SpiderJobEnvVar.objects.create(cronjob=cronjob, **env_var)

        return cronjob


class SpiderCronJobUpdateSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        attrs = super(SpiderCronJobUpdateSerializer, self).validate(attrs)
        if "schedule" in attrs and not croniter.is_valid(attrs.get("schedule")):
            raise serializers.ValidationError(
                {"schedule": "Value is not a valid cron schedule."}
            )
        return attrs

    class Meta:
        model = SpiderCronJob
        fields = ("cjid", "status", "schedule")

    def update(self, instance, validated_data):
        status = validated_data.get("status", "")
        schedule = validated_data.get("schedule", "")
        key = instance.key
        if "schedule" in validated_data:
            instance.schedule = schedule
            update_schedule(key, schedule)
        if "status" in validated_data:
            instance.status = status
            if status == SpiderCronJob.ACTIVE_STATUS:
                enable_cronjob(key)
            elif status == SpiderCronJob.DISABLED_STATUS:
                disable_cronjob(key)
        instance.save()
        return instance
