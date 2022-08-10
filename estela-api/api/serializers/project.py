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
    user = UserDetailSerializer(required=False)

    class Meta:
        model = Permission
        fields = ["user", "permission"]


class ProjectSerializer(serializers.ModelSerializer):
    users = PermissionSerializer(source="permission_set", many=True, required=False)

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
        project_jobs = SpiderJob.objects.filter(spider__project=project)
        total_network_usage = project_jobs.aggregate(Sum("total_response_bytes"))
        return total_network_usage["total_response_bytes__sum"]

    def get_processing_time(self, project):
        project_jobs = SpiderJob.objects.filter(spider__project=project)
        total_processing_time = project_jobs.aggregate(Sum("lifespan"))
        return total_processing_time["lifespan__sum"]

    def get_item_count(self, project):
        project_jobs = SpiderJob.objects.filter(spider__project=project)
        total_item_count = project_jobs.aggregate(Sum("item_count"))
        return total_item_count["item_count__sum"]

    def get_request_count(self, project):
        project_jobs = SpiderJob.objects.filter(spider__project=project)
        total_request_count = project_jobs.aggregate(Sum("request_count"))
        return total_request_count["request_count__sum"]

    def get_datatype_data_size(self, project, datatype):
        if not spiderdata_db_client.get_connection():
            raise APIException(f"Could not get {datatype} data size.")
        return spiderdata_db_client.get_database_size(str(project.pid), "items")

    def get_items_data_size(self, project):
        return get_datatype_data_size(project, "items")

    def get_requests_data_size(self, project):
        return get_datatype_data_size(project, "requests")

    def get_logs_data_size(self, project):
        return get_datatype_data_size(project, "logs")


class ProjectUpdateSerializer(serializers.ModelSerializer):
    ACTION_CHOICES = [
        ("remove", "Remove"),
        ("add", "Add"),
    ]
    PERMISSION_CHOICES = [
        ("EDITOR", "Editor"),
        ("VIEWER", "Viewer"),
    ]

    users = UserDetailSerializer(many=True, required=False)
    email = serializers.EmailField(write_only=True, required=False)
    action = serializers.ChoiceField(
        write_only=True, choices=ACTION_CHOICES, required=False
    )
    permission = serializers.ChoiceField(
        write_only=True, choices=PERMISSION_CHOICES, required=False
    )

    class Meta:
        model = Project
        fields = ("pid", "name", "users", "email", "action", "permission")
