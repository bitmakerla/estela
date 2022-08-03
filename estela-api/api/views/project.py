from datetime import datetime, timedelta

from api import errors
from api.mixins import BaseViewSet
from api.serializers.job import ProjectJobSerializer, SpiderJobSerializer
from api.serializers.project import (
    ProjectSerializer,
    ProjectUpdateSerializer,
    ProjectUsageSerializer,
    UsageRecordSerializer,
)
from core.models import Permission, Project, Spider, SpiderJob, UsageRecord, User
from django.core.paginator import Paginator
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, NotFound, ParseError


class ProjectViewSet(BaseViewSet, viewsets.ModelViewSet):
    model_class = Project
    serializer_class = ProjectSerializer
    lookup_field = "pid"

    MAX_PAGINATION_SIZE = 100
    MIN_PAGINATION_SIZE = 1
    DEFAULT_PAGINATION_SIZE = 10

    def get_parameters(self, request):
        page = int(request.query_params.get("page", 1))
        page_size = int(
            request.query_params.get("page_size", self.DEFAULT_PAGINATION_SIZE)
        )
        return page, page_size

    def get_queryset(self):
        return self.request.user.project_set.filter(deleted=False)

    def perform_create(self, serializer):
        instance = serializer.save()
        instance.users.add(
            self.request.user,
            through_defaults={"permission": Permission.OWNER_PERMISSION},
        )
        UsageRecord.objects.create(
            project=instance,
            processing_time=timedelta(0),
            network_usage=0,
            item_count=0,
            request_count=0,
            items_data_size=0,
            requests_data_size=0,
            logs_data_size=0,
        )

    @swagger_auto_schema(
        operation_summary="Update Project information",
        request_body=ProjectUpdateSerializer,
        responses={status.HTTP_200_OK: ProjectUpdateSerializer()},
    )
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = ProjectUpdateSerializer(
            instance, data=request.data, partial=partial
        )
        serializer.is_valid(raise_exception=True)

        name = serializer.validated_data.get("name", "")
        user_email = serializer.validated_data.pop("email", "")
        action = serializer.validated_data.pop("action", "")
        permission = serializer.validated_data.pop("permission", "")

        if name:
            instance.name = name
        if user_email:
            user = User.objects.filter(email=user_email)
            if user:
                user = user.get()
                if action == "add":
                    instance.users.add(
                        user, through_defaults={"permission": permission}
                    )
                elif action == "remove":
                    if (
                        user.permission_set.get(project=instance).permission
                        != Permission.OWNER_PERMISSION
                    ):
                        instance.users.remove(user)
                    else:
                        raise PermissionDenied({"error": "User cannot be removed."})
            else:
                raise NotFound({"email": "User does not exist."})
        serializer.save()

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_200_OK, headers=headers)

    @swagger_auto_schema(
        responses={status.HTTP_204_NO_CONTENT: "Project deleted"},
    )
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)

    def perform_destroy(self, instance):
        instance.deleted = True
        instance.save()

    @swagger_auto_schema(
        methods=["GET"],
        manual_parameters=[
            openapi.Parameter(
                "page",
                openapi.IN_QUERY,
                description="DataPaginated.",
                type=openapi.TYPE_NUMBER,
                required=False,
            ),
            openapi.Parameter(
                "page_size",
                openapi.IN_QUERY,
                description="DataPaginated.",
                type=openapi.TYPE_NUMBER,
                required=False,
            ),
        ],
        responses={status.HTTP_200_OK: ProjectJobSerializer()},
    )
    @action(methods=["GET"], detail=True)
    def jobs(self, request, *args, **kwargs):
        page, page_size = self.get_parameters(request)

        if page_size > self.MAX_PAGINATION_SIZE or page_size < self.MIN_PAGINATION_SIZE:
            raise ParseError({"error": errors.INVALID_PAGE_SIZE})
        if page < 1:
            raise ParseError({"error": errors.INVALID_PAGE_SIZE})
        spider_set = Spider.objects.filter(project=kwargs["pid"])
        sid_set = spider_set.values_list("pk", flat=True)
        jobs_set = SpiderJob.objects.filter(spider__in=sid_set)
        paginator_result = Paginator(jobs_set, page_size)
        page_result = paginator_result.page(page)
        results = SpiderJobSerializer(page_result, many=True)
        return Response(
            {"results": results.data, "count": jobs_set.count()},
            status=status.HTTP_200_OK,
        )

    @swagger_auto_schema(
        methods=["GET"],
        responses={status.HTTP_200_OK: ProjectUsageSerializer()},
    )
    @action(methods=["GET"], detail=True)
    def current_usage(self, request, *args, **kwargs):
        instance = self.get_object()
        project = Project.objects.get(pid=kwargs["pid"])
        serializer = ProjectUsageSerializer(project)
        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )

    @swagger_auto_schema(
        methods=["GET"],
        manual_parameters=[
            openapi.Parameter(
                "start_date",
                openapi.IN_QUERY,
                description="Start of date range.",
                type=openapi.TYPE_STRING,
                required=False,
            ),
            openapi.Parameter(
                "end_date",
                openapi.IN_QUERY,
                description="End of date range.",
                type=openapi.TYPE_STRING,
                required=False,
            ),
        ],
        responses={status.HTTP_200_OK: UsageRecordSerializer(many=True)},
    )
    @action(methods=["GET"], detail=True)
    def usage(self, request, *args, **kwargs):
        instance = self.get_object()
        project = Project.objects.get(pid=kwargs["pid"])
        start_date = kwargs.get("start_date", datetime.today().replace(day=1))
        end_date = kwargs.get("end_date", datetime.utcnow())
        serializer = UsageRecordSerializer(
            UsageRecord.objects.filter(
                project=project, created_at__range=[start_date, end_date]
            ),
            many=True,
        )
        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )
