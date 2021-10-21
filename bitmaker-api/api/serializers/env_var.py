from rest_framework import serializers

from core.models import SpiderJobEnvVar


class SpiderJobEnvVarSerializer(serializers.ModelSerializer):
    class Meta:
        model = SpiderJobEnvVar
        fields = ("name", "value")
