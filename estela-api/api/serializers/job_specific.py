from rest_framework import serializers

from core.models import SpiderJobArg, SpiderJobEnvVar, SpiderJobTag


class SpiderJobArgSerializer(serializers.ModelSerializer):
    class Meta:
        model = SpiderJobArg
        fields = ("name", "value")


class SpiderJobEnvVarSerializer(serializers.ModelSerializer):
    class Meta:
        model = SpiderJobEnvVar
        fields = ("name", "value", "masked")

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        ret["value"] = "" if instance.masked else instance.value
        return ret


class SpiderJobTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = SpiderJobTag
        fields = ("name",)
