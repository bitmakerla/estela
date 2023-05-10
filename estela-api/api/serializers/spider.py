from rest_framework import serializers

from api.serializers.job_specific import SpiderJobEnvVarSerializer
from api.views.project import update_env_vars
from core.models import DataStatus, Spider
from api import errors


class SpiderSerializer(serializers.ModelSerializer):
    env_vars = SpiderJobEnvVarSerializer(
        many=True, required=False, help_text="Spider env variables."
    )
    class Meta:
        model = Spider
        fields = ("sid", "name", "project", "env_vars", "data_status", "data_expiry_days")


class SpiderUpdateSerializer(serializers.ModelSerializer):
    sid = serializers.UUIDField(
        read_only=True, help_text="A UUID identifying this spider."
    )
    env_vars = SpiderJobEnvVarSerializer(
        many=True, required=False, help_text="Project env variables."
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
        fields = ("sid", "env_vars", "data_status", "data_expiry_days")

    def update(self, instance, validated_data):
        data_status = validated_data.get("data_status", "")
        data_expiry_days = validated_data.get("data_expiry_days", 1)
        env_vars = validated_data.get("env_vars", [])
        if "data_status" in validated_data:
            instance.data_status = data_status
            if data_status == DataStatus.PENDING_STATUS and data_expiry_days > 0:
                instance.data_expiry_days = data_expiry_days
            else:
                raise serializers.ValidationError({"error": errors.INVALID_DATA_STATUS})
        if "env_vars" in validated_data:
            update_env_vars(instance, env_vars, level="spider")

        instance.save()
        return instance
