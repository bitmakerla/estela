from rest_framework import serializers

from api.serializers.project import ActivitySerializer
from core.models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    activity = ActivitySerializer(required=True, help_text="Activity being notified.")

    class Meta:
        model = Notification
        fields = ("nid", "activity", "seen")


class NotificationUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ("nid", "seen")

    def update(self, instance, validated_data):
        instance.seen = validated_data.get("seen", instance.seen)
        instance.save()
        return instance
