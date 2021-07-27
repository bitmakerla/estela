from rest_framework import serializers

from core.models import Project, Spider, SpiderJob, SpiderJobArg
from core.registry import get_registry_token


class ProjectSerializer(serializers.ModelSerializer):
    token = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = ("pid", "name", "token", "container_image")

    def get_token(self, project):
        return get_registry_token()


class SpiderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Spider
        fields = "__all__"
        read_only_fields = ("sid", "project")


class SpiderJobArgSerializer(serializers.ModelSerializer):
    class Meta:
        model = SpiderJobArg
        fields = ("name", "value")


class SpiderJobSerializer(serializers.ModelSerializer):
    args = SpiderJobArgSerializer(many=True, required=False)

    class Meta:
        model = SpiderJob
        fields = (
            "jid",
            "spider",
            "created",
            "status",
            "name",
            "args",
            "job_type",
            "schedule",
            "job_status",
        )
        read_only_fields = ("jid", "spider", "created", "name")
        extra_kwargs = {
            "status": {"write_only": True},
        }

    def create(self, validated_data):
        args_data = validated_data.pop("args", [])
        job = SpiderJob.objects.create(**validated_data)
        for arg in args_data:
            SpiderJobArg.objects.create(job=job, **arg)
        return job
