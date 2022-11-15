from django.contrib.auth.models import User
from django.db.models import Sum
from rest_framework import serializers
from rest_framework.exceptions import APIException

from config.job_manager import spiderdata_db_client
from core.models import Permission, Project, SpiderJob, UsageRecord


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
        fields = ("pid", "name", "container_image", "users")


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
    network_usage = serializers.SerializerMethodField()
    processing_time = serializers.SerializerMethodField()
    item_count = serializers.SerializerMethodField()
    request_count = serializers.SerializerMethodField()
    items_data_size = serializers.SerializerMethodField()
    requests_data_size = serializers.SerializerMethodField()
    logs_data_size = serializers.SerializerMethodField()

    class Meta:
        model = Project
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

    def get_network_usage(self, project):
        return self.get_aggregate_sum(project, "total_response_bytes")

    def get_processing_time(self, project):
        return self.get_aggregate_sum(project, "lifespan")

    def get_item_count(self, project):
        return self.get_aggregate_sum(project, "item_count")

    def get_request_count(self, project):
        return self.get_aggregate_sum(project, "request_count")

    def get_aggregate_sum(self, project, field):
        project_jobs = SpiderJob.objects.filter(spider__project=project)
        total_sum = project_jobs.aggregate(Sum(field))
        return total_sum[f"{field}__sum"]

    def get_items_data_size(self, project):
        return self.get_datatype_data_size(project, "items")

    def get_requests_data_size(self, project):
        return self.get_datatype_data_size(project, "requests")

    def get_logs_data_size(self, project):
        return self.get_datatype_data_size(project, "logs")

    def get_datatype_data_size(self, project, datatype):
        if not spiderdata_db_client.get_connection():
            raise APIException(
                f"Could not connect to the database to get {datatype} data size."
            )
        return spiderdata_db_client.get_database_size(str(project.pid), datatype)


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
    users = UserDetailSerializer(many=True, required=False, help_text="Afected users.")
    user = serializers.EmailField(
        write_only=True, required=False, help_text="User email address."
    )
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

    class Meta:
        model = Project
        fields = ("pid", "name", "users", "user", "email", "action", "permission")
