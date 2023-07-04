from rest_framework import serializers

from api.serializers.project import ActivitySerializer
from core.models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(
        required=True, help_text="User notification ID."
    )
    activity = ActivitySerializer(required=True, help_text="Activity being notified.")

    class Meta:
        model = Notification
        fields = ("id", "activity", "seen")

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        user = instance.notification.user

        is_superuser = user.is_superuser or user.is_staff
        user_in_project = instance.notification.project.users.filter(id=user.id)
        if is_superuser and not user_in_project:
            ret["notification"]["user"]["username"] = "An admin"
        else:
            ret["notification"]["user"]["username"] = user.username
        return ret


class NotificationUpdateSerializer(serializers.ModelSerializer):
    seen = serializers.BooleanField(
        required=False,
        help_text="Whether the user has seen the notification.",
    )

    class Meta:
        model = Notification
        fields = ("id", "seen")

    def update(self, instance, validated_data):
        instance.seen = validated_data.get("seen", instance.seen)
        instance.save()
        return instance
