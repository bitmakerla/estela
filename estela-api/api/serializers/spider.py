from rest_framework import serializers

from core.models import DataStatus, Spider


class SpiderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Spider
        fields = ("sid", "name", "project", "data_status", "data_expiry_days")


class SpiderUpdateSerializer(serializers.ModelSerializer):
    sid = serializers.UUIDField(
        read_only=True, help_text="A UUID identifying this spider."
    )
    data_status = serializers.ChoiceField(
        choices=DataStatus.HIGH_LEVEL_OPTIONS,
        required=False,
        help_text="New data status.",
    )
    data_expiry_days = serializers.IntegerField(
        required=False,
        help_text="New data expiry days.",
    )

    class Meta:
        model = Spider
        fields = ("sid", "name", "data_status", "data_expiry_days")

    def update(self, instance, validated_data):
        instance.data_status = validated_data.get("data_status", instance.data_status)
        instance.data_expiry_days = validated_data.get(
            "data_expiry_days", instance.data_expiry_days
        )
        instance.save()
        return instance
