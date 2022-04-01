from rest_framework import serializers

from core.models import Project, Permission
from django.contrib.auth.models import User


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
    action = serializers.ChoiceField(write_only=True, choices=ACTION_CHOICES, required=False)
    permission = serializers.ChoiceField(write_only=True, choices=PERMISSION_CHOICES, required=False)

    class Meta:
        model = Project
        fields = ("pid", "name", "users", "email", "action", "permission")
