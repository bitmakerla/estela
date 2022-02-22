from ***REMOVED***.shortcuts import get_object_or_404
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from rest_framework import viewsets, status
from rest_framework.response import Response

from api.mixins import BaseViewSet
from api.serializers.deploy import (
    DeploySerializer,
    DeployCreateSerializer,
    DeployUpdateSerializer,
)

from api import errors
from core.models import Deploy, Project
from core.registry import upload_project_to_s3
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
        operation_summary="Create a new Deploy",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                "project_zip": openapi.Schema(
                    type=openapi.TYPE_FILE,
                    description="Project zip",
                ),
            },
            required=["project_zip"],
        ),
    )
    def create(self, request, *args, **kwargs):
        project = get_object_or_404(Project, pid=self.kwargs["pid"])
        user = request.user
        serializer = DeployCreateSerializer(data=request.data)

        serializer.is_valid(raise_exception=True)

        serializer.save(project=project, user=user)

        project_zip = request.FILES.get("project_zip", False)

        if not project_zip:
            return Response(
                {"error": "Project zip not found"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Upload project to S3
        error = upload_project_to_s3("{}.zip".format(self.kwargs["pid"]), project_zip)

        if error:
            return Response(
                {"error": error},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Launch Job to build Project
        launch_deploy_job(
            self.kwargs["pid"], serializer.data["did"], project.container_image
        )
        ##############################

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
            return Response(
                {"error": errors.INSUFFICIENT_PERMISSIONS.format("Admin")},
                status=status.HTTP_403_FORBIDDEN,
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
