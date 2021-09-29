from rest_framework import serializers

from core.models import SpiderJobArg


class SpiderJobArgSerializer(serializers.ModelSerializer):
    class Meta:
        model = SpiderJobArg
        fields = ("name", "value")
