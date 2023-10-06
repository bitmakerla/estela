from rest_framework import serializers
from core.models import ProxyProvider
from api.serializers.job_specific import SpiderJobEnvVarSerializer


class ProxyProviderSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProxyProvider
        fields = ["name", "description", "proxyid"]


class ProxyProviderUpdateSerializer(serializers.Serializer):
    level = serializers.CharField(max_length=100, help_text="Spider or project")
    project_or_spider_id = serializers.CharField(
        max_length=100, help_text="Project id where the update will be performed"
    )


class ProxyProviderResponseSerializer(serializers.Serializer):
    success = serializers.BooleanField()
    env_vars = SpiderJobEnvVarSerializer(
        many=True, required=False, help_text="Env vars for the instace(project, spider)"
    )
