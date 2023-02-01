from django.shortcuts import get_object_or_404
from drf_yasg.utils import swagger_auto_schema
from rest_framework import status, viewsets
from rest_framework.exceptions import APIException, ParseError, PermissionDenied
from rest_framework.response import Response

from api import errors
from api.mixins import BaseViewSet
from api.serializers.deploy import (
    DeployCreateSerializer,
    DeploySerializer,
    DeployUpdateSerializer,
)
from config.job_manager import credentials
from core.models import Deploy, Project
from core.views import launch_deploy_job


class DeployViewSet(
    BaseViewSet,
    viewsets.ModelViewSet,
):
    model_class = Deploy
    serializer_class = DeploySerializer
    lookup_field = "did"
    queryset = Deploy.objects.all()

    def get_queryset(self):
        if self.request is None:
            return Deploy.objects.none()
        return (
            super(DeployViewSet, self)
            .get_queryset()
            .filter(
                project__pid=self.kwargs["pid"],
            )
        )

    @swagger_auto_schema(
        request_body=DeployCreateSerializer,
        responses={status.HTTP_201_CREATED: DeployCreateSerializer()},
    )
    def create(self, request, *args, **kwargs):
        project = get_object_or_404(Project, pid=self.kwargs["pid"])
        user = request.user
        serializer = DeployCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        project_zip = serializer.validated_data.pop("project_zip", None)
        serializer.save(project=project, user=user)

        if not project_zip:
            raise ParseError({"error": "Project zip not found"})

        # Upload project to S3
        error = credentials.upload_project(
            "{}.zip".format(self.kwargs["pid"]), project_zip
        )

        if error:
            raise APIException({"error": error})

        # Launch Job to build Project
        launch_deploy_job(
            self.kwargs["pid"], serializer.data["did"], project.container_image
        )

        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data, status=status.HTTP_201_CREATED, headers=headers
        )

    @swagger_auto_schema(
        request_body=DeployUpdateSerializer,
        responses={status.HTTP_200_OK: DeployUpdateSerializer()},
    )
    def update(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            raise PermissionDenied(
                {"error": errors.INSUFFICIENT_PERMISSIONS.format("Admin")}
            )
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = DeployUpdateSerializer(
            instance, data=request.data, partial=partial
        )
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        if getattr(instance, "_prefetched_objects_cache", None):
            instance._prefetched_objects_cache = {}

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_200_OK, headers=headers)
