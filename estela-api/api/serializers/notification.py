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
<<<<<<< HEAD
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
            ret["notification"]["user"]["username"] = user.username
        return ret


class UserNotificationUpdateSerializer(serializers.ModelSerializer):
    seen = serializers.BooleanField(
        required=False,
        help_text="Whether the user has seen the notification.",
    )

    class Meta:
        model = UserNotification
        fields = ("id", "seen")
=======
        model = Notification
        fields = ("nid", "seen")
>>>>>>> 5d4c8dc (BITMAKER-2625 estela: Propose Model and implementation for Activity Menu (#160))

    def update(self, instance, validated_data):
        instance.seen = validated_data.get("seen", instance.seen)
        instance.save()
        return instance
