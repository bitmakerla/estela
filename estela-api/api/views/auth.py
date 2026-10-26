from django.conf import settings
from django.contrib.auth.models import User
from drf_yasg.utils import swagger_auto_schema
from rest_framework import permissions, status, viewsets
from rest_framework.authtoken.serializers import AuthTokenSerializer
from rest_framework.decorators import action
from rest_framework.response import Response

from api import errors
from api.authentication import AUTHENTICATION_CLASSES, SIGN_IN_CLASSES
from core.models import ApiKey
from api.permissions import IsProfileUser
from api.serializers.auth import UserProfileSerializer, WhoAmISerializer


class AuthAPIViewSet(viewsets.GenericViewSet):
    @swagger_auto_schema(
        methods=["GET"], responses={status.HTTP_200_OK: WhoAmISerializer()}
    )
    @action(
        methods=["GET"],
        detail=False,
        permission_classes=[permissions.IsAuthenticated],
        authentication_classes=AUTHENTICATION_CLASSES,
        serializer_class=WhoAmISerializer,
    )
    def whoami(self, request, *args, **kwargs):
        """Who the caller is. An API key carries no username, so this is how a
        program finds out which account it is acting as."""
        data = {"username": request.user.username, "email": request.user.email}
        if isinstance(request.auth, ApiKey):
            data["scopes"] = request.auth.scopes
        return Response(data)


class UserProfileViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated, IsProfileUser]
    authentication_classes = SIGN_IN_CLASSES
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
        # With AUTH_MODE=oidc the provider owns the password, so there is none here to confirm.
        if settings.AUTH_MODE == "local":
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
