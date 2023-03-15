from django.contrib.auth.models import User
from core.models import UserProfile
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from rest_framework import serializers
from rest_framework.authtoken.models import Token
from api.serializers.project import UserDetailSerializer


class UserSerializer(serializers.ModelSerializer):
    """A serializer for our user objects."""

    class Meta:
        model = User
        fields = ["id", "email", "username", "password"]
        extra_kwargs = {"password": {"write_only": True}}

    def validate(self, attrs):
        attrs = super().validate(attrs)
        if User.objects.filter(email=attrs["email"]).exists():
            raise serializers.ValidationError(
                {"email": "A user with that email already exists."}
            )
        return attrs

    def create(self, validated_data):
        """Create and return a new user."""
        user = User(
            email=validated_data["email"],
            username=validated_data["username"],
        )

        try:
            validate_password(validated_data["password"], user)
        except ValidationError as e:
            raise serializers.ValidationError({"password": str(e)})

        user.set_password(validated_data["password"])
        user.save()

        return user


class TokenSerializer(serializers.ModelSerializer):
    user = UserDetailSerializer(
        required=False, help_text="User details."
    )
    key = serializers.CharField(max_length=40, help_text="User's auth token key.")

    class Meta:
        model = Token
        fields = ["user", "key"]


class UserProfileSerializer(serializers.HyperlinkedModelSerializer):
    last_password_change = serializers.ReadOnlyField(
        source="userprofile.last_password_change",
        read_only=True
    )

    class Meta:
        model = User
        fields = ["username", "email", "last_password_change"]
