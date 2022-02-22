from rest_framework import serializers

from core.models import Project, Permission
from ***REMOVED***.contrib.auth.models import User


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
    users = UserDetailSerializer(many=True, required=False)

    class Meta:
        model = Project
        fields = ("pid", "name", "users")
