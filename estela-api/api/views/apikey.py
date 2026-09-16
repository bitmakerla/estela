from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from drf_yasg.utils import swagger_auto_schema
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.authentication import TokenAuthentication
from rest_framework.response import Response

from api.authentication import ApiKeyAuthentication, generate_key
from api.permissions import IsSessionAuthenticated
from api.serializers.apikey import (
    ApiKeyCreateResponseSerializer,
    ApiKeyCreateSerializer,
    ApiKeySerializer,
)
from core.models import ApiKey


class ApiKeyViewSet(viewsets.GenericViewSet, mixins.ListModelMixin):
    """Manage the caller's own API keys.

    ApiKeyAuthentication is listed so a request made with a key is recognised and
    then refused by IsSessionAuthenticated: a leaked key must not be able to mint
    more keys.
    """

    authentication_classes = [ApiKeyAuthentication, TokenAuthentication]
    permission_classes = [permissions.IsAuthenticated, IsSessionAuthenticated]
    serializer_class = ApiKeySerializer

    def get_queryset(self):
        if self.request is None:
            return ApiKey.objects.none()
        return ApiKey.objects.filter(user=self.request.user, revoked_at__isnull=True)

    @swagger_auto_schema(
        request_body=ApiKeyCreateSerializer,
        responses={status.HTTP_201_CREATED: ApiKeyCreateResponseSerializer()},
    )
    def create(self, request, *args, **kwargs):
        serializer = ApiKeyCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        days = serializer.validated_data.get(
            "expires_in_days", settings.API_KEY_DEFAULT_DAYS
        )
        plaintext, prefix, key_hash = generate_key()
        api_key = ApiKey.objects.create(
            user=request.user,
            name=serializer.validated_data["name"],
            scopes=serializer.validated_data["scopes"],
            prefix=prefix,
            key_hash=key_hash,
            expires_at=timezone.now() + timedelta(days=int(days)),
        )

        data = ApiKeySerializer(api_key).data
        data["key"] = plaintext
        return Response(data, status=status.HTTP_201_CREATED)

    @swagger_auto_schema(responses={status.HTTP_204_NO_CONTENT: "Key revoked"})
    def destroy(self, request, *args, **kwargs):
        api_key = self.get_object()
        api_key.revoked_at = timezone.now()
        api_key.save(update_fields=["revoked_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)
