from datetime import datetime, timezone
from drf_yasg.utils import swagger_auto_schema
from rest_framework import status, viewsets, permissions, serializers
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.serializers import AuthTokenSerializer
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.authentication import TokenAuthentication
from django.template.loader import render_to_string
from django.core.mail import EmailMessage
from django.utils.encoding import force_text
from django.utils.http import urlsafe_base64_decode
from api.tokens import account_reset_token
from django.contrib.auth.models import User
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, MethodNotAllowed
from django.conf import settings
from django.contrib.auth.models import update_last_login
from django.shortcuts import redirect
from django.contrib.auth.password_validation import validate_password
from api.exceptions import EmailServiceError, UserNotFoundError, ChangePasswordError
from api.serializers.auth import TokenSerializer, UserSerializer, UserProfileSerializer
from core.views import send_verification_email, send_change_password_email, send_alert_password_changed
from django.core import exceptions
from django.contrib.auth import authenticate
from django.utils.translation import gettext_lazy as _
from api.permissions import IsProfileUser
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
        serializer:AuthTokenSerializer = self.get_serializer(
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
        token, created = Token.objects.get_or_create(user=user)
        return Response(TokenSerializer(token).data)

    @swagger_auto_schema(
        methods=["POST"], responses={status.HTTP_200_OK: TokenSerializer()}
    )
    @action(methods=["POST"], detail=False, serializer_class=UserSerializer)
    def register(self, request, *args, **kwargs):
        if not settings.REGISTER == "True":
            raise MethodNotAllowed({"error": "This action is disabled"})
        serializer:AuthTokenSerializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        user.is_active = False
        user.save()
        update_last_login(None, user)
        try:
            send_verification_email(user, request)
        except Exception as ex:
            raise EmailServiceError(
                {
                    "error": "Your user was created but there was an error sending the verification email. Please try to log in later."
                }
            )
        token, created = Token.objects.get_or_create(user=user)
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
                {
                    "message": "Thank you for your email confirmation. You can now log in to your account."
                },
            )
        else:
            self.retry_send_verification_email(user, request)
            return redirect(
                settings.CORS_ORIGIN_WHITELIST[0],
                {"message": "Activation link is invalid!"},
            )

class UserProfileViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated, IsProfileUser]
    authentication_classes = [TokenAuthentication]
    lookup_field = "username"

    def get_queryset(self):
        if not self.request.user.is_superuser:
            return self.queryset.filter(username=self.request.user.username)
        return self.queryset
class ChangePasswordViewSet(viewsets.GenericViewSet):
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
        permission_classes=[permissions.IsAuthenticated],
        authentication_classes=[TokenAuthentication]
    )
    def request(self, request, *args, **kwargs):
        email = request.data['email']
        user = User.objects.filter(email=email)
        if not user:
            raise UserNotFoundError({"error": "User does not exist."})
        user = user.get()
        if (
            int((datetime.now(timezone.utc) - user.userprofile.last_password_change).total_seconds())
            < settings.PASSWORD_CHANGE_TIME
        ):
            raise ChangePasswordError({
                "error": "You can only change your password every 6 months. Try again later."
            })
        try:
            send_change_password_email(user, request)
        except Exception as ex:
            raise EmailServiceError({
                "error": "There was an error sending the verification email. Please try again later."
            })
        token, created = Token.objects.get_or_create(user=user)
        return Response(TokenSerializer(token).data)
    
    @action(methods=["GET"], detail=False)
    def validate(self, request, *args, **kwargs):
        token, user_id = self.get_parameters(request)
        user = User.objects.filter(pk=user_id)
        if not user:
            return redirect(
                settings.CORS_ORIGIN_WHITELIST[0], {"error": "User does not exist."}
            )
        user = user.get()
        if account_reset_token.check_token(user, token):
            return redirect(
                settings.CORS_ORIGIN_WHITELIST[0] + "/change_password",
                {
                    "message": "You can now change your password."
                },
            )
        else:
            try:
                send_change_password_email(user, request)
            except Exception as ex:
                raise EmailServiceError({
                    "error": "There was an error sending the verification email. Please try again later."
                })
            return redirect(
                settings.CORS_ORIGIN_WHITELIST[0],
                {
                    "message": "Activation link is invalid. Check your email again."
                },
            )
    @swagger_auto_schema(
        methods=["PATCH"], responses={status.HTTP_200_OK: TokenSerializer()}
    )
    @action(methods=["PATCH"], detail=False)
    def confirm(self, request, *args, **kwargs):
        token, user_id = self.get_parameters(request)
        old_password = request.data['old_password']
        new_password = request.data['new_password']
        new_password_repeat = request.data['new_password_repeat']
        user = User.objects.filter(pk=user_id)
        if not user:
            raise UserNotFoundError({"error": "User does not exist."})
        user = user.get()
        if account_reset_token.check_token(user, token):
            try:
                validate_password(new_password, user)
            except exceptions.ValidationError as exception:
                raise exception
            user = authenticate(username=user.username, password=old_password)
            if not user:
                msg = _("Unable to log in with provided credentials.")
                raise serializers.ValidationError(msg, code="authorization")
            if new_password != new_password_repeat:
                msg = _("Passwords do not match.")
                raise serializers.ValidationError(msg, code="not_match_passwords")
            user.set_password(new_password)
            user.userprofile.last_password_change = datetime.now(timezone.utc)
            user.save()
        else:
            try:
                send_change_password_email(user, request)
            except Exception as ex:
                raise EmailServiceError(
                    {
                        "error": "There was an error sending the verification email. Please try again later."
                    }
                )
            raise ChangePasswordError({
                "error": "Activation link is invalid. Check your email again."
            })
        try:
            send_alert_password_changed(user, request)
        except Exception as ex:
            raise EmailServiceError({
                "error": "There was an error sending the verification email. Please try again later."
            })
        token, created = Token.objects.get_or_create(user=user)
        return Response(TokenSerializer(token).data)