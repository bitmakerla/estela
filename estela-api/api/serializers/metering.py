from rest_framework import serializers

from core.models import MeteredUsageRecord, Project


class MeteringReportSerializer(serializers.Serializer):
    project_id = serializers.UUIDField(
        help_text="Project UUID (``Project.pid``) this usage rolls up to."
    )
    resource_kind = serializers.CharField(max_length=64)
    resource_id = serializers.CharField(max_length=512)
    interval_start = serializers.DateTimeField()
    interval_end = serializers.DateTimeField()
    metrics = serializers.DictField(
        child=serializers.JSONField(),
        help_text="Open metric payload (network_bytes, storage_bytes, …).",
    )
    idempotency_key = serializers.CharField(max_length=512)
    kind = serializers.ChoiceField(
        choices=MeteredUsageRecord.Kind.choices,
        default=MeteredUsageRecord.Kind.DELTA_SLICE,
        required=False,
    )
    source_ref = serializers.CharField(
        max_length=512, required=False, allow_blank=True, default=""
    )
    reporter = serializers.CharField(
        max_length=64,
        required=False,
        allow_blank=True,
        default="",
        help_text="Emitting service (e.g. bitmaker-proxy). Defaults to estela.",
    )
    adjustment_reason = serializers.ChoiceField(
        choices=MeteredUsageRecord.AdjustmentReason.choices,
        required=False,
        allow_blank=True,
        default="",
    )

    def validate_project_id(self, value):
        project = Project.objects.filter(pk=value).first()
        if project is None:
            raise serializers.ValidationError("Project not found.")
        return project

    def validate(self, attrs):
        if attrs["interval_end"] <= attrs["interval_start"]:
            raise serializers.ValidationError(
                {"interval_end": "Must be after interval_start (half-open interval)."}
            )
        if not attrs.get("metrics"):
            raise serializers.ValidationError(
                {"metrics": "At least one metric key is required."}
            )
        kind = attrs.get("kind") or MeteredUsageRecord.Kind.DELTA_SLICE
        if kind == MeteredUsageRecord.Kind.ADJUSTMENT and not attrs.get(
            "adjustment_reason"
        ):
            raise serializers.ValidationError(
                {
                    "adjustment_reason": "Required when kind is ADJUSTMENT.",
                }
            )
        return attrs


class MeteringReportResponseSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    recorded_at = serializers.DateTimeField()
    duplicate = serializers.BooleanField()
    resource_kind = serializers.CharField()
    resource_id = serializers.CharField()
