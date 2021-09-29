from rest_framework import serializers

from core.models import SpiderJob, SpiderJobArg, SpiderCronJob

from api.serializers.arg import SpiderJobArgSerializer


class SpiderCronJobSerializer(serializers.ModelSerializer):
    cargs = SpiderJobArgSerializer(many=True, required=False)

    class Meta:
        model = SpiderCronJob
        fields = (
            "cjid",
            "spider",
            "created",
            "name",
            "cargs",
            "schedule",
            "status",
        )


class SpiderCronJobCreateSerializer(serializers.ModelSerializer):
    cargs = SpiderJobArgSerializer(many=True, required=False)

    class Meta:
        model = SpiderCronJob
        fields = (
            "cjid",
            "name",
            "cargs",
            "schedule",
            "status",
        )

    def create(self, validated_data):
        args_data = validated_data.pop("cargs", [])
        cronjob = SpiderCronJob.objects.create(**validated_data)
        for arg in args_data:
            SpiderJobArg.objects.create(cronjob=cronjob, **arg)
        return cronjob
