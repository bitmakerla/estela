from rest_framework import serializers

from core.models import Spider


class SpiderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Spider
        fields = ("sid", "name", "project")


class SpiderCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Spider
        fields = ("sid", "name", "project")

    def create(self, validated_data):
        # create spider Notification
        return Spider(**validated_data)
