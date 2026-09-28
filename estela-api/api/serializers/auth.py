"""Serializers for what is left of accounts: who is calling, and the profile screen.

The login, registration, password-change and password-reset serializers are gone along with
the views that used them: signing in is the gateway's and the identity provider's job now.
"""

from api.serializers.project import UserDetailSerializer
from django.contrib.auth.models import User
from rest_framework import serializers
from rest_framework.authtoken.models import Token
from rest_framework.validators import UniqueValidator


class TokenSerializer(serializers.ModelSerializer):
    user = UserDetailSerializer(required=False, help_text="User details.")
    key = serializers.CharField(max_length=40, help_text="User's auth token key.")

    class Meta:
        model = Token
        fields = ["user", "key"]


class UserProfileSerializer(serializers.HyperlinkedModelSerializer):
    username = serializers.CharField(
        validators=[
            UniqueValidator(
                queryset=User.objects.all(),
                message="A user with that username already exists",
            )
        ]
    )
    email = serializers.CharField(
        validators=[
            UniqueValidator(
                queryset=User.objects.all(),
                message="A user with that email already exists",
            )
        ]
    )
    memory_quota = serializers.IntegerField(source="profile.memory_quota", read_only=True)

    class Meta:
        model = User
        fields = ["username", "email", "is_superuser", "memory_quota"]
        read_only_fields = ["is_superuser", "memory_quota"]


class WhoAmISerializer(serializers.Serializer):
    """Who the caller is, and what the credential in hand may do.

    A key carries no username and no visible permissions, so a program holding
    one cannot tell whether it is about to be refused until it tries.
    """

    username = serializers.CharField(read_only=True)
    email = serializers.CharField(read_only=True)
    scopes = serializers.ListField(
        child=serializers.CharField(),
        read_only=True,
        help_text="Extra permissions of the API key used. Absent for a session.",
    )
