from drf_yasg.utils import swagger_auto_schema
from rest_framework import status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.serializers import AuthTokenSerializer
from rest_framework.decorators import action
from rest_framework.response import Response

from api.serializers.auth import TokenSerializer, UserSerializer


class AuthAPIViewSet(viewsets.GenericViewSet):
    serializer_class = AuthTokenSerializer

    @swagger_auto_schema(
        methods=["POST"], responses={status.HTTP_200_OK: TokenSerializer()}
    )
    @action(methods=["POST"], detail=False)
    def login(self, request, *args, **kwargs):
        serializer = self.get_serializer(
            data=request.data, context={"request": self.request}
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
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        token, created = Token.objects.get_or_create(user=user)
        return Response(TokenSerializer(token).data)
