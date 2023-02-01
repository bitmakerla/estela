from datetime import datetime, timezone

from django.conf import settings
from django.contrib.auth.models import User, update_last_login
from django.core.mail import EmailMessage
from django.shortcuts import redirect
from django.template.loader import render_to_string
from django.utils.encoding import force_text
from django.utils.http import urlsafe_base64_decode
from drf_yasg.utils import swagger_auto_schema
from rest_framework import status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.serializers import AuthTokenSerializer
from rest_framework.decorators import action
from rest_framework.exceptions import MethodNotAllowed, PermissionDenied
from rest_framework.response import Response

from api.exceptions import EmailServiceError
from api.serializers.auth import TokenSerializer, UserSerializer
from api.tokens import account_activation_token
from core.views import send_verification_email


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
        serializer = self.get_serializer(
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
        serializer = self.get_serializer(data=request.data)
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
        if account_activation_token.check_token(user, token):
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
