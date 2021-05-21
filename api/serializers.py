from core.models import Project, Spider, SpiderJob
from rest_framework import serializers
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


class SpiderJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = SpiderJob
        fields = ("jid", "spider", "created", "status", "name")
        read_only_fields = ("jid", "spider", "created", "status", "name")
