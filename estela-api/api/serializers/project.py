from django.contrib.auth.models import User
from rest_framework import serializers
from core.models import Permission, Project, UsageRecord


class UserDetailSerializer(serializers.ModelSerializer):
    """A serializer for our user objects."""

    class Meta:
        model = User
        fields = ["username", "email"]


class PermissionSerializer(serializers.ModelSerializer):
    user = UserDetailSerializer(required=False, help_text="Username.")

    class Meta:
        model = Permission
        fields = ["user", "permission"]


class ProjectSerializer(serializers.ModelSerializer):
    pid = serializers.UUIDField(
        read_only=True, help_text="A UUID identifying this project."
    )
    users = PermissionSerializer(
        source="permission_set",
        many=True,
        required=False,
        help_text="Users with permissions on this project.",
    )
    container_image = serializers.CharField(
        read_only=True, help_text="Path of the project's container image."
    )

    class Meta:
        model = Project
        fields = (
            "pid",
            "name",
            "category",
            "container_image",
            "users",
            "data_status",
            "data_expiry_days",
        )


class UsageRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = UsageRecord
        fields = (
            "created_at",
            "processing_time",
            "network_usage",
            "item_count",
            "request_count",
            "items_data_size",
            "requests_data_size",
            "logs_data_size",
        )


class ProjectUsageSerializer(serializers.ModelSerializer):
    pid = serializers.SerializerMethodField()
    name = serializers.SerializerMethodField()
    processing_time = serializers.SerializerMethodField()

    class Meta:
        model = UsageRecord
        fields = (
            "pid",
            "name",
            "network_usage",
            "processing_time",
            "item_count",
            "request_count",
            "items_data_size",
            "requests_data_size",
            "logs_data_size",
        )

    def get_pid(self, usage_record: UsageRecord):
        return usage_record.project.pid

    def get_name(self, usage_record: UsageRecord):
        return usage_record.project.name

    def get_processing_time(self, usage_record: UsageRecord):
        return usage_record.processing_time.total_seconds()


class ProjectUpdateSerializer(serializers.ModelSerializer):
    ACTION_CHOICES = [
        ("remove", "Remove"),
        ("add", "Add"),
        ("update", "Update"),
    ]
    PERMISSION_CHOICES = [
        ("ADMIN", "Admin"),
        ("DEVELOPER", "Developer"),
        ("VIEWER", "Viewer"),
    ]
    DATA_STATUS_OPTIONS = [
        ("PERSISTENT", "Persistent"),
        ("PENDING", "Pending"),
    ]
    pid = serializers.UUIDField(
        read_only=True, help_text="A UUID identifying this project."
    )
    users = UserDetailSerializer(many=True, required=False, help_text="Affected users.")
    email = serializers.EmailField(
        write_only=True, required=False, help_text="Email address."
    )
    action = serializers.ChoiceField(
        write_only=True,
        choices=ACTION_CHOICES,
        required=False,
        help_text="Performed action.",
    )
    permission = serializers.ChoiceField(
        write_only=True,
        choices=PERMISSION_CHOICES,
        required=False,
        help_text="New permission.",
    )
    data_status = serializers.ChoiceField(
        write_only=True,
        choices=DATA_STATUS_OPTIONS,
        required=False,
        help_text="New data status.",
    )
    data_expiry_days = serializers.IntegerField(
        write_only=True,
        required=False,
        help_text="New data expiry days.",
    )

    class Meta:
        model = Project
        fields = (
            "pid",
            "name",
            "users",
            "user",
            "email",
            "action",
            "permission",
            "data_status",
            "data_expiry_days",
        )
