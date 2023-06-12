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
    id = serializers.IntegerField(
        required=True, help_text="Unique user notification ID."
    )
    notification = NotificationSerializer(
        required=True, help_text="Notification to which the user is subscribed."
    )

    class Meta:
        model = UserNotification
        fields = ("id", "notification", "seen", "created")

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        user = instance.notification.user

        is_superuser = user.is_superuser or user.is_staff
        user_in_project = instance.notification.project.users.filter(id=user.id)
        if is_superuser and not user_in_project:
            ret["notification"]["user"]["username"] = "Bitmaker Cloud Admin"
        else:
            ret["notification"]["user"][
                "username"
            ] = user.username
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
