"""What is left of account handling now that the identity provider owns it.

Password login, registration, email verification, forgotten-password resets and password
changes are gone: people sign in through the gateway, against the shared issuer, and the
first request that reaches estela creates or links their account (api/authentication.py).

What stays is estela's own business: telling a caller who they are, and the profile row its
screens show. Editing that profile no longer asks for a password, because there is none to
ask for. A username or email changed here is a display label, not a new identity: accounts
are matched on the issuer's subject claim.
"""

from django.contrib.auth.models import User
from drf_yasg.utils import swagger_auto_schema
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from api import errors
from api.authentication import AUTHENTICATION_CLASSES
from api.permissions import IsProfileUser
from api.serializers.auth import UserProfileSerializer, WhoAmISerializer
from core.models import ApiKey


class AuthAPIViewSet(viewsets.GenericViewSet):
    authentication_classes = AUTHENTICATION_CLASSES
    permission_classes = [permissions.IsAuthenticated]

    @swagger_auto_schema(
        methods=["GET"], responses={status.HTTP_200_OK: WhoAmISerializer()}
    )
    @action(methods=["GET"], detail=False, serializer_class=WhoAmISerializer)
    def whoami(self, request, *args, **kwargs):
        """Who the caller is. The web asks this to learn who signed in, and a program asks it
        because an API key carries no username."""
        data = {"username": request.user.username, "email": request.user.email}
        if isinstance(request.auth, ApiKey):
            data["scopes"] = request.auth.scopes
        return Response(data)


class UserProfileViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated, IsProfileUser]
    authentication_classes = AUTHENTICATION_CLASSES
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
        serializer: UserProfileSerializer = self.get_serializer(user, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(data=serializer.data, status=status.HTTP_200_OK)
