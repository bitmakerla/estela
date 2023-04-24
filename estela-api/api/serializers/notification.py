from rest_framework import serializers

from api.serializers.project import ProjectDetailSerializer, UserDetailSerializer
from core.models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    user = UserDetailSerializer(
        required=True, help_text="User who performed the action."
    )
    project = ProjectDetailSerializer(
        required=True, help_text="Project where the action was performed."
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
