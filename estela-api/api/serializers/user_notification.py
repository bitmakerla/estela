from rest_framework import serializers

from api.serializers.project import ProjectDetailSerializer, UserDetailSerializer
from core.models import Notification, UserNotification


class NotificationSerializer(serializers.ModelSerializer):
    user = UserDetailSerializer(
        required=True, help_text="User who performed the action."
    )
    project = ProjectDetailSerializer(
        required=True, help_text="Project where the action was performed."
    )

    class Meta:
        model = Notification
        fields = ("nid", "message", "user", "project")


class UserNotificationSerializer(serializers.ModelSerializer):
    notification = NotificationSerializer(
        read_only=True, help_text="Notification to which the user is subscribed."
    )

    class Meta:
        model = UserNotification
        fields = ("id", "notification", "seen", "created_at")

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        user_notification = instance.notification.user
        if user_notification.is_superuser or user_notification.is_staff:
            ret["notification"]["user"]["username"] = "Bitmaker Cloud Admin"
        else:
            ret["notification"]["user"][
                "username"
            ] = instance.notification.user.username
        return ret


class UserNotificationUpdateSerializer(serializers.ModelSerializer):
    seen = serializers.BooleanField(
        required=False,
        help_text="Whether the user has seen the notification.",
    )

    class Meta:
        model = UserNotification
        fields = ("id", "seen")

    def update(self, instance, validated_data):
        instance.seen = validated_data.get("seen", instance.seen)
        instance.save()
        return instance
