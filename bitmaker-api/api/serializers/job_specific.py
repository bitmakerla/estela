from rest_framework import serializers

from core.models import SpiderJobArg, SpiderJobEnvVar, SpiderJobTag


class SpiderJobArgSerializer(serializers.ModelSerializer):
    class Meta:
        model = SpiderJobArg
        fields = ("name", "value")


class SpiderJobEnvVarSerializer(serializers.ModelSerializer):
    class Meta:
        model = SpiderJobEnvVar
        fields = ("name", "value")


class SpiderJobTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = SpiderJobTag
        fields = ("name",)
