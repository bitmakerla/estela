import secrets
import time
from datetime import timedelta

import redis
from django.conf import settings
from django.utils import timezone
from drf_yasg.utils import swagger_auto_schema
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, Throttled, ValidationError
from rest_framework.response import Response

from api.authentication import AUTHENTICATION_CLASSES, generate_key
from api.operators import is_operator
from api.permissions import IsSessionAuthenticated
from api.serializers.apikey import (
    ApiKeyCreateResponseSerializer,
    ApiKeyCreateSerializer,
    ApiKeySerializer,
)
from core.models import ApiKey

# `estela login`: estela hands the CLI a key and a code, and the key works once a signed-in person
# approves the code by creating a key with it (ApiKeyViewSet.create). Until then only the key's
# hash waits in Redis, for CLI_LOGIN_SECONDS, and a code approves one key.
CLI_LOGIN_SECONDS = 600
# ponytail: one cap shared by everyone, so a flood fills Redis this much at most (and holds up
# logins for a minute); limit per client if that ever bites.
CLI_LOGINS_PER_MINUTE = 60
CODE_LETTERS = "BCDFGHJKLMNPQRSTVWXZ"  # no vowels, so no words; no digits to mistake


def _redis():
    return redis.from_url(settings.REDIS_URL)


def _pending(code):
    # Letters only, so "kdtw qxrb" and "KDTW-QXRB" are the same code.
    return "cli-login:" + "".join(c for c in code.upper() if c in CODE_LETTERS)


def _take(code):
    """(hash, prefix) of the key waiting for this code, or None. Only once: of two approvals at the
    same time, only one deletes it."""
    conn = _redis()
    value = conn.get(_pending(code))
    if value is None or not conn.delete(_pending(code)):
        return None
    return value.decode().split()


class ApiKeyViewSet(viewsets.GenericViewSet, mixins.ListModelMixin):
    """Manage the caller's own API keys.

    ApiKeyAuthentication is listed so a request made with a key is recognised and
    then refused by IsSessionAuthenticated: a leaked key must not be able to mint
    more keys.
    """

    authentication_classes = AUTHENTICATION_CLASSES
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
        scopes = serializer.validated_data["scopes"]
        if ApiKey.OPERATOR_SCOPE in scopes and not is_operator(request.user):
            raise PermissionDenied({"scopes": "Only Operators can give a key the operator scope."})

        days = serializer.validated_data.get(
            "expires_in_days", settings.API_KEY_DEFAULT_DAYS
        )
        code = serializer.validated_data.get("code")
        if code:
            # The key `estela login` holds and is waiting for: it is not ours to return.
            pending = _take(code)
            if pending is None:
                raise ValidationError(
                    {"code": "This code is unknown or expired. Run 'estela login' again."}
                )
            plaintext = None
            key_hash, prefix = pending
        else:
            plaintext, prefix, key_hash = generate_key()
        api_key = ApiKey.objects.create(
            user=request.user,
            name=serializer.validated_data["name"],
            scopes=scopes,
            prefix=prefix,
            key_hash=key_hash,
            expires_at=timezone.now() + timedelta(days=int(days)),
        )

        data = ApiKeySerializer(api_key).data
        if plaintext:
            data["key"] = plaintext
        return Response(data, status=status.HTTP_201_CREATED)

    # Left out of the schema: only estela-cli calls it, and the generated clients have no use for it.
    @swagger_auto_schema(auto_schema=None)
    @action(
        methods=["POST"],
        detail=False,
        url_path="cli-login",
        authentication_classes=[],
        permission_classes=[permissions.AllowAny],
    )
    def cli_login(self, request, *args, **kwargs):
        """Starts `estela login`. Anyone may call it: the key it hands out works only once a
        signed-in person approves its code in the web."""
        conn = _redis()
        minute = "cli-login-starts:{}".format(int(time.time()) // 60)
        if conn.incr(minute) > CLI_LOGINS_PER_MINUTE:
            raise Throttled(wait=60)
        conn.expire(minute, 60)

        plaintext, prefix, key_hash = generate_key()
        code = None
        while code is None:  # two logins drawing the same of 20^8 codes: draw again
            letters = "".join(secrets.choice(CODE_LETTERS) for _ in range(8))
            if conn.set(_pending(letters), f"{key_hash} {prefix}", ex=CLI_LOGIN_SECONDS, nx=True):
                code = f"{letters[:4]}-{letters[4:]}"
        return Response(
            {
                "key": plaintext,
                "code": code,
                "url": f"{settings.FRONTEND_HOST}/settings/apiKeys?code={code}",
                "expires_in": CLI_LOGIN_SECONDS,
            },
            status=status.HTTP_201_CREATED,
        )

    @swagger_auto_schema(responses={status.HTTP_204_NO_CONTENT: "Key revoked"})
    def destroy(self, request, *args, **kwargs):
        api_key = self.get_object()
        api_key.revoked_at = timezone.now()
        api_key.save(update_fields=["revoked_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)
