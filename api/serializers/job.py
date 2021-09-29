from rest_framework import serializers

from core.models import SpiderJob, SpiderJobArg

from api.serializers.arg import SpiderJobArgSerializer


class SpiderJobSerializer(serializers.ModelSerializer):
    args = SpiderJobArgSerializer(many=True, required=False)

    class Meta:
        model = SpiderJob
        fields = (
            "jid",
            "spider",
            "created",
            "name",
            "args",
            "job_status",
            "cronjob",
        )


class SpiderJobCreateSerializer(serializers.ModelSerializer):
    args = SpiderJobArgSerializer(many=True, required=False)

    class Meta:
        model = SpiderJob
        fields = (
            "jid",
            "name",
            "args",
            "job_status",
            "cronjob",
        )

    def create(self, validated_data):
        args_data = validated_data.pop("args", [])
        job = SpiderJob.objects.create(**validated_data)
        for arg in args_data:
            SpiderJobArg.objects.create(job=job, **arg)
        return job


class SpiderJobUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SpiderJob
        fields = (
            "jid",
            "status",
        )
