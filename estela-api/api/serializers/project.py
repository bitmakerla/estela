from rest_framework import serializers

from core.models import Project, Permission
from django.contrib.auth.models import User


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


class ProjectUpdateSerializer(serializers.ModelSerializer):
    ACTION_CHOICES = [
        ("remove", "Remove"),
        ("add", "Add"),
    ]
    PERMISSION_CHOICES = [
        ("EDITOR", "Editor"),
        ("VIEWER", "Viewer"),
    ]

    pid = serializers.UUIDField(
        read_only=True, help_text="A UUID identifying this project."
    )
    users = UserDetailSerializer(many=True, required=False, help_text="Afected users.")
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
        fields = ("pid", "name", "users", "email", "action", "permission")
