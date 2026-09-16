from django.conf import settings
from rest_framework import serializers

from core.models import ApiKey


class ApiKeySerializer(serializers.ModelSerializer):
    """What a key looks like once created. Never carries the secret."""

    # Declared so the schema says "array of string"; a bare JSONField documents as a string.
    scopes = serializers.ListField(child=serializers.CharField(), read_only=True)

    class Meta:
        model = ApiKey
        fields = [
            "id",
            "name",
            "prefix",
            "scopes",
            "created",
            "last_used_at",
            "expires_at",
        ]


class ApiKeyCreateSerializer(serializers.ModelSerializer):
    scopes = serializers.ListField(
        child=serializers.ChoiceField(choices=ApiKey.SCOPES),
        required=False,
        default=list,
        help_text="Extra permissions. Empty means read-only.",
    )

    expires_in_days = serializers.ChoiceField(
        choices=settings.API_KEY_EXPIRY_CHOICES,
        required=False,
        write_only=True,
        help_text="How long the key lasts. Omit it to get the deployment's default.",
    )

    class Meta:
        model = ApiKey
        fields = ["name", "scopes", "expires_in_days"]

    def validate_scopes(self, value):
        return sorted(set(value))


class ApiKeyCreateResponseSerializer(ApiKeySerializer):
    """Schema only: tells Swagger that creation also returns the key itself."""

    key = serializers.CharField(
        read_only=True, help_text="The key itself. It is not stored and never shown again."
    )

    class Meta(ApiKeySerializer.Meta):
        fields = ApiKeySerializer.Meta.fields + ["key"]
