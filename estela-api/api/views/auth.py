from datetime import datetime, timezone

from django.conf import settings
from django.contrib.auth.models import User, update_last_login
from django.core.mail import EmailMessage
from django.shortcuts import redirect
from django.template.loader import render_to_string
from django.utils.encoding import force_text
from django.utils.http import urlsafe_base64_decode
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import permissions, status, viewsets
from rest_framework.authentication import TokenAuthentication
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.serializers import AuthTokenSerializer
from rest_framework.decorators import action
from rest_framework.exceptions import MethodNotAllowed, PermissionDenied
from rest_framework.response import Response

from api import errors
from api.exceptions import EmailServiceError, UserNotFoundError
from api.permissions import IsProfileUser
from api.serializers.auth import (
    ChangePasswordSerializer,
    ResetPasswordConfirmSerializer,
    ResetPasswordRequestSerializer,
    TokenSerializer,
    UserProfileSerializer,
    UserSerializer,
)
from api.tokens import account_reset_token
from core.views import (
    send_alert_password_changed,
    send_change_password_email,
    send_verification_email,
)


class AuthAPIViewSet(viewsets.GenericViewSet):
    serializer_class = AuthTokenSerializer

    def retry_send_verification_email(self, user, request):
        if (
            int((datetime.now(timezone.utc) - user.last_login).total_seconds())
            > settings.PASSWORD_RESET_TIMEOUT
        ):
            update_last_login(None, user)
            send_verification_email(user, request)

    @swagger_auto_schema(
        methods=["POST"], responses={status.HTTP_200_OK: TokenSerializer()}
    )
    @action(methods=["POST"], detail=False)
    def login(self, request, *args, **kwargs):
        serializer: AuthTokenSerializer = self.get_serializer(
            data=request.data, context={"request": self.request}
        )

        user = User.objects.filter(username=request.data["username"])
        if user and not user.get().is_active:
            user = user.get()
            self.retry_send_verification_email(user, request)
            raise PermissionDenied(
                {"error": "Check the verification email that was sent to you."}
            )

        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data["user"]
        token, _ = Token.objects.get_or_create(user=user)
        return Response(TokenSerializer(token).data)

    @swagger_auto_schema(
        methods=["POST"], responses={status.HTTP_200_OK: TokenSerializer()}
    )
    @action(methods=["POST"], detail=False, serializer_class=UserSerializer)
    def register(self, request, *args, **kwargs):
        if not settings.REGISTER == "True":
            raise MethodNotAllowed({"error": "This action is disabled"})
        serializer: AuthTokenSerializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        user.is_active = False
        user.save()
        update_last_login(None, user)
        try:
            send_verification_email(user, request)
        except Exception:
            raise EmailServiceError({"error": errors.ERROR_SEND_VERIFICATION_EMAIL})
        token, _ = Token.objects.get_or_create(user=user)
        return Response(TokenSerializer(token).data)

    @action(methods=["GET"], detail=False)
    def activate(self, request, *args, **kwargs):
        token = request.query_params.get("token", "")
        user_id_base64 = request.query_params.get("pair", "")
        user_id = force_text(urlsafe_base64_decode(user_id_base64))
        user = User.objects.filter(pk=user_id)
        if not user:
            return redirect(
                settings.CORS_ORIGIN_WHITELIST[0], {"error": "User does not exist."}
            )
        user = user.get()
        if account_reset_token.check_token(user, token):
            user.is_active = True
            user.save()
            mail_subject = "New User Registered."
            message = render_to_string(
                "alert_new_user.html",
                {
                    "user": user,
                },
            )
            email = EmailMessage(
                mail_subject,
                message,
                from_email=settings.VERIFICATION_EMAIL,
                to=settings.EMAILS_TO_ALERT.split(","),
            )
            email.send()
            return redirect(
                settings.CORS_ORIGIN_WHITELIST[0],
                {"message": errors.CONFIRMATION_EMAIL_SENT},
            )
        else:
            self.retry_send_verification_email(user, request)
            return redirect(
                settings.CORS_ORIGIN_WHITELIST[0],
                {"message": "Activation link is invalid!"},
            )


class UserProfileViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated, IsProfileUser]
    authentication_classes = [TokenAuthentication]
    lookup_field = "username"

    def get_queryset(self):
        if not self.request.user.is_superuser:
            return self.queryset.filter(username=self.request.user.username)
        return self.queryset

    @swagger_auto_schema(
        responses={status.HTTP_200_OK: UserProfileSerializer()},
    )
    def retrieve(self, request, *args, **kwargs):
        user: User = request.user
        requested_user: User = User.objects.filter(username=kwargs["username"]).first()

        if requested_user is None:
            return Response(
                data={"error": "This user doesn't exist in estela."},
                status=status.HTTP_404_NOT_FOUND,
            )
        if user != requested_user:
            return Response(
                data={"error": errors.UNAUTHORIZED_PROFILE},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        serializer: UserProfileSerializer = self.get_serializer(user)
        return Response(data=serializer.data, status=status.HTTP_200_OK)

    @swagger_auto_schema(
        responses={status.HTTP_200_OK: UserProfileSerializer()},
    )
    def update(self, request, *args, **kwargs):
        username = kwargs.get("username", "")
        user: User = request.user
        if username != user.username:
            return Response(
                data={"error": "This user doesn't exist in estela."},
                status=status.HTTP_404_NOT_FOUND,
            )
        user_data: dict = {
            "username": request.user.username,
            "password": request.data.get("password", ""),
        }
        authSerializer: AuthTokenSerializer = AuthTokenSerializer(
            data=user_data, context={"request": self.request}
        )
        authSerializer.is_valid(raise_exception=True)
        serializer: UserProfileSerializer = self.get_serializer(
            user, data={**request.data}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(data=serializer.data, status=status.HTTP_200_OK)


class ChangePasswordViewSet(viewsets.GenericViewSet):
    @swagger_auto_schema(
        request_body=ChangePasswordSerializer,
        responses={status.HTTP_200_OK: TokenSerializer()},
    )
    @action(
        methods=["PATCH"],
        detail=False,
        permission_classes=[permissions.IsAuthenticated],
        authentication_classes=[TokenAuthentication],
        serializer_class=ChangePasswordSerializer,
    )
    def change(self, request, *args, **kwargs):
        user = request.user
        serializer = ChangePasswordSerializer(data=request.data, context={"user": user})
        serializer.is_valid(raise_exception=True)
        user.set_password(serializer.data["new_password"])
        user.save()
        send_alert_password_changed(user)
        token, _ = Token.objects.get_or_create(user=user)
        return Response(TokenSerializer(token).data)


class ResetPasswordViewSet(viewsets.GenericViewSet):
    manual_parameters = [
        openapi.Parameter(
            "token",
            openapi.IN_QUERY,
            description="Token",
            type=openapi.TYPE_STRING,
            required=True,
        ),
        openapi.Parameter(
            "pair",
            openapi.IN_QUERY,
            description="Pair",
            type=openapi.TYPE_STRING,
            required=True,
        ),
    ]

    def get_parameters(self, request):
        token = request.query_params.get("token", "")
        user_id_base64 = request.query_params.get("pair", "")
        user_id = force_text(urlsafe_base64_decode(user_id_base64))
        return token, user_id

    @swagger_auto_schema(
        methods=["POST"], responses={status.HTTP_200_OK: TokenSerializer()}
    )
    @action(
        methods=["POST"],
        detail=False,
        serializer_class=ResetPasswordRequestSerializer,
    )
    def request(self, request, *args, **kwargs):
        serializer = ResetPasswordRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        user = User.objects.filter(email=email)
        if not user:
            raise UserNotFoundError()
        user = user.get()
        try:
            send_change_password_email(user)
        except Exception:
            raise EmailServiceError({"error": errors.SEND_EMAIL_LATER})
        token, _ = Token.objects.get_or_create(user=user)
        return Response(TokenSerializer(token).data)

    @swagger_auto_schema(
        methods=["GET"],
        manual_parameters=manual_parameters,
        responses={
            status.HTTP_200_OK: openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    "message": openapi.Schema(type=openapi.TYPE_STRING),
                },
            ),
            status.HTTP_400_BAD_REQUEST: openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    "message": openapi.Schema(type=openapi.TYPE_STRING),
                },
            ),
        },
    )
    @action(methods=["GET"], detail=False)
    def validate(self, request, *args, **kwargs):
        token, user_id = self.get_parameters(request)
        user = User.objects.filter(pk=user_id)
        if not user:
            raise UserNotFoundError()
        user = user.get()
        if account_reset_token.check_token(user, token):
            return Response(
                data={"message": "Token is valid."}, status=status.HTTP_200_OK
            )
        else:
            return Response(
                data={"message": "Token is invalid."},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @swagger_auto_schema(
        methods=["PATCH"],
        manual_parameters=manual_parameters,
        responses={
            status.HTTP_200_OK: TokenSerializer(),
            status.HTTP_401_UNAUTHORIZED: openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    "error": openapi.Schema(type=openapi.TYPE_STRING),
                },
            ),
        },
    )
    @action(
        methods=["PATCH"], detail=False, serializer_class=ResetPasswordConfirmSerializer
    )
    def confirm(self, request, *args, **kwargs):
        token, user_id = self.get_parameters(request)
        user = User.objects.filter(pk=user_id)
        if not user:
            raise UserNotFoundError()
        user = user.get()
        serializer = ResetPasswordConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user.set_password(serializer.validated_data["new_password"])
        user.save()
        send_alert_password_changed(user)
        token, _ = Token.objects.get_or_create(user=user)
        return Response(TokenSerializer(token).data)
