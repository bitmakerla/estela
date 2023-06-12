from datetime import datetime, timedelta
from django.shortcuts import get_object_or_404

from django.core.paginator import Paginator
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, ParseError, PermissionDenied
from rest_framework.response import Response

from api import errors
from api.mixins import BaseViewSet, NotificationsHandlerMixin
from api.serializers.job import ProjectJobSerializer, SpiderJobSerializer
from api.serializers.cronjob import ProjectCronJobSerializer, SpiderCronJobSerializer
from api.serializers.project import (
    ProjectSerializer,
    ProjectUpdateSerializer,
    ProjectUsageSerializer,
    UsageRecordSerializer,
)
from core.models import (
    DataStatus,
    Permission,
    Project,
    Spider,
    SpiderCronJob,
    SpiderJob,
    UsageRecord,
    User,
)


class ProjectViewSet(BaseViewSet, NotificationsHandlerMixin, viewsets.ModelViewSet):
    model_class = Project
    queryset = Project.objects.all()
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
        return (
            Project.objects.filter(deleted=False)
            if self.request.user.is_superuser or self.request.user.is_staff
            else self.request.user.project_set.filter(deleted=False)
        )

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
        self.save_notification(
            user=self.request.user,
            message=f"created project {instance.name}.",
            project=instance,
        )

    @swagger_auto_schema(
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
        data_status = serializer.validated_data.pop("data_status", "")
        data_expiry_days = serializer.validated_data.pop("data_expiry_days", 0)
        message = ""

        if name:
            old_name = instance.name
            instance.name = name
            message = f"renamed project {old_name} ({instance.pid}) to {name}."

        user = request.user
        is_superuser = user.is_superuser or user.is_staff
        if user_email and (is_superuser or user_email != user.email):
            if not is_superuser and not (
                user.permission_set.get(project=instance).permission
                in [Permission.ADMIN_PERMISSION, Permission.OWNER_PERMISSION]
            ):
                raise PermissionDenied(
                    {"permission": "You do not have permission to do this."}
                )

            affected_user = User.objects.filter(email=user_email)
            if not affected_user:
                raise NotFound({"email": "User does not exist."})

            affected_user = affected_user.get()
            existing_permission = affected_user.permission_set.filter(
                project=instance
            ).first()
            if (
                existing_permission
                and existing_permission.permission == Permission.OWNER_PERMISSION
            ):
                raise ParseError(
                    {"error": "You cannot modify the permissions of an owner user."}
                )

            if action == "add":
                instance.users.add(
                    affected_user, through_defaults={"permission": permission}
                )
                message = f"added {user_email}."
            elif action == "remove":
                instance.users.remove(affected_user)
                message = f"removed {user_email}."
            elif action == "update":
                instance.users.remove(affected_user)
                instance.users.add(
                    affected_user, through_defaults={"permission": permission}
                )
                message = f"updated {user_email}'s permissions to {permission}."
            else:
                raise ParseError({"error": "Action not supported."})

        if data_status:
            if data_status == DataStatus.PERSISTENT_STATUS:
                instance.data_status = DataStatus.PERSISTENT_STATUS
                message = "changed data persistence to persistent."
            elif data_status == DataStatus.PENDING_STATUS and data_expiry_days > 0:
                instance.data_status = DataStatus.PENDING_STATUS
                instance.data_expiry_days = data_expiry_days
                message = f"changed data persistence to {data_expiry_days} days."
            else:
                raise ParseError({"error": errors.INVALID_DATA_STATUS})

        self.save_notification(
            user=self.request.user,
            message=message,
            project=instance,
        )

        serializer.save()
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_200_OK, headers=headers)

    @swagger_auto_schema(
        responses={status.HTTP_204_NO_CONTENT: "Project deleted"},
    )
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        project = get_object_or_404(Project, pid=self.kwargs["pid"])
        self.save_notification(
            user=self.request.user,
            message=f"deleted project {instance.name} ({instance.pid}).",
            project=project,
        )
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
                description="A page number within the paginated result set.",
                type=openapi.TYPE_NUMBER,
                required=False,
            ),
            openapi.Parameter(
                "page_size",
                openapi.IN_QUERY,
                description="Number of results to return per page.",
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
        manual_parameters=[
            openapi.Parameter(
                "page",
                openapi.IN_QUERY,
                description="A page number within the paginated result set.",
                type=openapi.TYPE_NUMBER,
                required=False,
            ),
            openapi.Parameter(
                "page_size",
                openapi.IN_QUERY,
                description="Number of results to return per page.",
                type=openapi.TYPE_NUMBER,
                required=False,
            ),
        ],
        responses={status.HTTP_200_OK: ProjectCronJobSerializer()},
    )
    @action(methods=["GET"], detail=True)
    def cronjobs(self, request, *args, **kwargs):
        page, page_size = self.get_parameters(request)
        if page_size > self.MAX_PAGINATION_SIZE or page_size < self.MIN_PAGINATION_SIZE:
            raise ParseError({"error": errors.INVALID_PAGE_SIZE})
        if page < 1:
            raise ParseError({"error": errors.INVALID_PAGE_SIZE})
        spider_set = Spider.objects.filter(project=kwargs["pid"])
        sid_set = spider_set.values_list("pk", flat=True)
        cronjobs_set = SpiderCronJob.objects.filter(spider__in=sid_set, deleted=False)
        paginator_result = Paginator(cronjobs_set, page_size)
        page_result = paginator_result.page(page)
        results = SpiderCronJobSerializer(page_result, many=True)
        return Response(
            {"results": results.data, "count": cronjobs_set.count()},
            status=status.HTTP_200_OK,
        )

    @swagger_auto_schema(
        methods=["GET"],
        responses={status.HTTP_200_OK: ProjectUsageSerializer()},
    )
    @action(methods=["GET"], detail=True)
    def current_usage(self, request, *args, **kwargs):
        project = Project.objects.get(pid=kwargs["pid"])
        serializer = ProjectUsageSerializer(
            UsageRecord.objects.filter(project=project).first()
        )
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
        project = Project.objects.get(pid=kwargs["pid"])
        start_date = request.query_params.get(
            "start_date", datetime.today().replace(day=1)
        )
        end_date = request.query_params.get("end_date", datetime.utcnow())
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
