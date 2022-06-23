from rest_framework import serializers

from core.models import Spider


class SpiderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Spider
        fields = ("sid", "name", "project")
