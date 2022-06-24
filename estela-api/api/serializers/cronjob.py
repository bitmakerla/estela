from croniter import croniter
from rest_framework import serializers

from core.models import SpiderJobArg, SpiderJobEnvVar, SpiderCronJob, SpiderJobTag

from api.serializers.job_specific import (
    SpiderJobArgSerializer,
    SpiderJobEnvVarSerializer,
    SpiderJobTagSerializer,
)
from core.cronjob import enable_cronjob, disable_cronjob, update_schedule


class SpiderCronJobSerializer(serializers.ModelSerializer):
    cargs = SpiderJobArgSerializer(many=True, required=False)
    cenv_vars = SpiderJobEnvVarSerializer(many=True, required=False)
    ctags = SpiderJobTagSerializer(many=True, required=False)

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
        )


class SpiderCronJobCreateSerializer(serializers.ModelSerializer):
    cargs = SpiderJobArgSerializer(many=True, required=False)
    cenv_vars = SpiderJobEnvVarSerializer(many=True, required=False)
    ctags = SpiderJobTagSerializer(many=True, required=False)

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
        fields = ("cjid", "status", "schedule", "unique_collection")

    def update(self, instance, validated_data):
        status = validated_data.get("status", "")
        schedule = validated_data.get("schedule", "")
        unique_collection = validated_data.get("unique_collection", False)
        name = instance.name
        if "schedule" in validated_data:
            instance.schedule = schedule
            update_schedule(name, schedule)
        if "status" in validated_data:
            instance.status = status
            if status == SpiderCronJob.ACTIVE_STATUS:
                enable_cronjob(name)
            elif status == SpiderCronJob.DISABLED_STATUS:
                disable_cronjob(name)
        if "unique_collection" in validated_data:
            instance.unique_collection = unique_collection
        instance.save()
        return instance
