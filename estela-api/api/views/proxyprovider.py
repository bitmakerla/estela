from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework import serializers
from core.models import ProxyProvider, Project, Spider, SpiderJobEnvVar, SpiderJob
from api.serializers.proxyprovider import (
    ProxyProviderUpdateSerializer,
    ProxyProviderSerializer,
    ProxyProviderResponseSerializer,
)
from api.serializers.job_specific import SpiderJobEnvVarSerializer
from api.mixins import BaseViewSet, ActionHandlerMixin
from drf_yasg.utils import swagger_auto_schema
from api.utils import update_env_vars

# from utils import update_env_vars


class ProxyProviderViewSet(BaseViewSet, viewsets.ModelViewSet, ActionHandlerMixin):
    queryset = ProxyProvider.objects.all()
    serializer_class = ProxyProviderSerializer

    @swagger_auto_schema(
        request_body=ProxyProviderUpdateSerializer,  # Especifica el serializer para la solicitud
        responses={
            status.HTTP_200_OK: ProxyProviderResponseSerializer()
        },  # Define las respuestas
    )
    def update(self, request, *args, **kwargs):
        "In the request we should specify spider, project or job"
        serializer = ProxyProviderUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if serializer.validated_data["level"] == "project":
            instance = Project.objects.get(
                pk=serializer.validated_data["project_or_spider_id"]
            )
        elif serializer.validated_data["level"] == "spider":
            instance = SpiderJob.objects.get(
                pk=serializer.validated_data["project_or_spider_id"]
            )
        proxy_provider = self.get_object()
        proxy_attrs = [
            "username",
            "password",
            "host",
            "port",
            "name",
        ]
        fields_and_values = vars(proxy_provider)
        replaces = {
            "password": "pass",
            "host": "url",
            "username": "user",
        }
        env_vars = []
        for field, value in fields_and_values.items():
            if field in proxy_attrs:
                name = replaces.get(field, field).upper()
                if name != "NAME":
                    masked = True
                else:
                    masked = False
                env_vars.append(
                    {"name": f"ESTELA_PROXY_{name}", "value": value, "masked": masked}
                )
        update_env_vars(
            instance, env_vars, level=serializer.validated_data["level"], delete=False
        )

        if serializer.validated_data["level"] == "project":
            env_vars_instance = SpiderJobEnvVar.objects.filter(
                project_id=serializer.validated_data["project_or_spider_id"]
            )
        if serializer.validated_data["level"] == "spider":
            env_vars_instance = SpiderJobEnvVar.objects.filter(
                spider_id=serializer.validated_data["project_or_spider_id"]
            )
        env_vars_serialized = SpiderJobEnvVarSerializer(
            env_vars_instance, required=False, many=True
        )
        resp_serializer = ProxyProviderResponseSerializer(
            data={"success": True, "env_vars": env_vars_serialized.data}
        )
        # response_ser = ProxyProviderResponseSerializer(data=rspse)
        resp_serializer.is_valid()
        return Response(resp_serializer.data, status=status.HTTP_200_OK)
