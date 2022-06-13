from core.models import Permission, Project, SpiderJob
from core.mongo import get_database_size
from django.contrib.auth.models import User
from django.db.models import Sum
from rest_framework import serializers


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


class ProjectUsageSerializer(serializers.ModelSerializer):
    network_usage = serializers.SerializerMethodField()
    processing_time = serializers.SerializerMethodField()
    items_storage_size = serializers.SerializerMethodField()
    requests_storage_size = serializers.SerializerMethodField()
    logs_storage_size = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = (
            "pid",
            "name",
            "network_usage",
            "processing_time",
            "items_storage_size",
            "requests_storage_size",
            "logs_storage_size",
        )

    def get_network_usage(self, project):
        project_jobs = SpiderJob.objects.filter(spider__project=project)
        total_network_usage = project_jobs.aggregate(Sum("total_response_bytes"))
        return total_network_usage["total_response_bytes__sum"]

    def get_processing_time(self, project):
        project_jobs = SpiderJob.objects.filter(spider__project=project)
        total_processing_time = project_jobs.aggregate(Sum("lifespan"))
        return total_processing_time["lifespan__sum"]

    def get_items_storage_size(self, project):
        return get_database_size(project, "items")

    def get_requests_storage_size(self, project):
        return get_database_size(project, "requests")

    def get_logs_storage_size(self, project):
        return 0


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
