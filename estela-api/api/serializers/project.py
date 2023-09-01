from django.contrib.auth.models import User
from rest_framework import serializers

from api.serializers.job_specific import SpiderJobEnvVarSerializer
from core.models import Activity, DataStatus, Permission, Project, UsageRecord


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


class ProjectDetailSerializer(serializers.ModelSerializer):
    pid = serializers.UUIDField(
        read_only=True, help_text="A UUID identifying this project."
    )
    name = serializers.CharField(read_only=True, help_text="Project name.")

    class Meta:
        model = Project
        fields = (
            "pid",
            "name",
        )


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
    env_vars = SpiderJobEnvVarSerializer(
        many=True, required=False, help_text="Project env variables."
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
            "framework",
            "container_image",
            "users",
            "env_vars",
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
    pid = serializers.UUIDField(
        read_only=True, help_text="A UUID identifying this project."
    )
    name = serializers.CharField(
        write_only=True, required=False, help_text="Project name."
    )
    users = UserDetailSerializer(many=True, required=False, help_text="Affected users.")
    email = serializers.EmailField(
        write_only=True, required=False, help_text="Email address."
    )
    name = serializers.CharField(
        write_only=True, required=False, help_text="Project name."
    )
    action = serializers.ChoiceField(
        write_only=True,
        choices=ACTION_CHOICES,
        required=False,
        help_text="Performed action.",
    )
    framework = serializers.ChoiceField(
        write_only=True,
        choices=Project.FRAMEWORK_CHOICES,
        required=False,
        help_text="Set project framework.",
    )
    env_vars = SpiderJobEnvVarSerializer(
        many=True, required=False, help_text="Project env variables."
    )
    permission = serializers.ChoiceField(
        write_only=True,
        choices=PERMISSION_CHOICES,
        required=False,
        help_text="New permission.",
    )
    data_status = serializers.ChoiceField(
        write_only=True,
        choices=DataStatus.HIGH_LEVEL_OPTIONS,
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
            "email",
            "action",
            "framework",
            "env_vars",
            "permission",
            "data_status",
            "data_expiry_days",
        )


class ActivitySerializer(serializers.ModelSerializer):
    user = UserDetailSerializer(
        required=True, help_text="User who performed the deploy."
    )
    project = ProjectDetailSerializer(
        required=True, help_text="Project where the activity was performed."
    )

    class Meta:
        model = Activity
        fields = (
            "user",
            "project",
            "description",
            "created",
        )

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        user = instance.user

        is_superuser = user.is_superuser or user.is_staff
        user_in_project = instance.project.users.filter(id=user.id)
        if is_superuser and not user_in_project:
            ret["user"]["username"] = user.username + " (admin)"

        return ret


class ProjectActivitySerializer(serializers.Serializer):
    results = ActivitySerializer(
        many=True, required=True, help_text="Project activities."
    )
    count = serializers.IntegerField(
        required=True, help_text="Project activities count."
    )
