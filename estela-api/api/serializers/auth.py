from api.serializers.project import UserDetailSerializer
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers
from rest_framework.authtoken.models import Token
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.validators import UniqueValidator


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
    password = serializers.CharField(style={"input_type": "password"}, write_only=True)

    class Meta:
        model = User
        fields = ["username", "email", "password"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance:
            self.fields.pop("password")


class ChangePasswordSerializer(serializers.Serializer):
    new_password = serializers.CharField(
        required=True, style={"input_type": "password"}
    )
    confirm_new_password = serializers.CharField(
        required=True, style={"input_type": "password"}
    )
    old_password = serializers.CharField(
        required=True, style={"input_type": "password"}
    )

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_new_password"]:
            raise serializers.ValidationError(
                {"new_password": "The new passwords do not match."}
            )

        try:
            validate_password(attrs["new_password"])
        except ValidationError as e:
            raise serializers.ValidationError({"new_password": str(e)})

        if self.context["user"].check_password(attrs["new_password"]):
            raise serializers.ValidationError(
                {
                    "new_password": "The new password cannot be the same as the old password."
                }
            )

        return attrs

    def validate_old_password(self, value):
        if not self.context["user"].check_password(value):
            msg = _("Incorrect authentication credentials.")
            raise AuthenticationFailed(msg, code="authentication_failed")
        return value


class ResetPasswordRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)


class ResetPasswordConfirmSerializer(serializers.Serializer):
    new_password = serializers.CharField(
        required=True, style={"input_type": "password"}
    )
    confirm_new_password = serializers.CharField(
        required=True, style={"input_type": "password"}
    )

    def validate(serlf, attrs):
        if attrs["new_password"] != attrs["confirm_new_password"]:
            raise serializers.ValidationError(
                {"new_password": "New passwords do not match."}
            )
        return attrs
