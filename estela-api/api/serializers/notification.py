from core.models import Notification
from rest_framework import serializers
from api.serializers.project import UserDetailSerializer


class NotificationSerializer(serializers.ModelSerializer):
    user = UserDetailSerializer(
        required=True, help_text="User who performed the action."
    )

    class Meta:
        model = Notification
        fields = (
            "nid",
            "user",
            "message",
            "project",
            "seen",
            "created_at",
        )


class UserNotificationSerializer(serializers.Serializer):
    results = NotificationSerializer(
        many=True, required=True, help_text="Project notifications."
    )
    count = serializers.IntegerField(
        required=True, help_text="Project notifications count."
    )
