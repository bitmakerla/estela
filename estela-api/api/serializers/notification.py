from rest_framework import serializers

from api.serializers.project import ActivitySerializer
from core.models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    activity = ActivitySerializer(required=True, help_text="Activity being notified.")

    class Meta:
        model = Notification
        fields = ("nid", "activity", "seen")

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        user = instance.activity.user

        is_superuser = user.is_superuser or user.is_staff
        user_in_project = instance.activity.project.users.filter(id=user.id)
        if is_superuser and not user_in_project:
            ret["activity"]["user"]["username"] = "An admin"
        else:
            ret["activity"]["user"]["username"] = user.username
        return ret


class NotificationUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ("nid", "seen")

    def update(self, instance, validated_data):
        instance.seen = validated_data.get("seen", instance.seen)
        instance.save()
        return instance
