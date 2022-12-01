from datetime import datetime, timedelta

from api import errors
from api.mixins import BaseViewSet
from api.serializers.job import ProjectJobSerializer, SpiderJobSerializer
from api.serializers.cronjob import ProjectCronJobSerializer, SpiderCronJobSerializer
from api.serializers.project import (
    NotificationSerializer,
    ProjectSerializer,
    ProjectUpdateSerializer,
    ProjectUsageSerializer,
    UsageRecordSerializer,
)
from core.models import (
    Permission,
    Project,
    Notification,
    Spider,
    SpiderJob,
    SpiderCronJob,
    UsageRecord,
    User,
)
from django.core.paginator import Paginator
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import NotFound, ParseError


class ProjectViewSet(BaseViewSet, viewsets.ModelViewSet):
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
        return self.request.user.project_set.filter(deleted=False)

    def create_notifications(self, message, instance, user, redirectto, alt_message=""):
        for user_ in instance.users.all():
            if user == user_:
                noti = Notification(message=message, user=user_, redirectto=redirectto)
            else:
                noti = Notification(
                    message=alt_message, user=user_, redirectto=redirectto
                )
            noti.save()
        return

    def perform_create(self, serializer):
        instance = serializer.save()
        instance.users.add(
            self.request.user,
            through_defaults={"permission": Permission.ADMIN_PERMISSION},
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
        self.create_notifications(
            f"You created a new Project: {instance.name}",
            instance,
            self.request.user,
            f"/projects/{instance.pid}/dashboard",
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
        user_permision = serializer.validated_data.pop("user", "")
        action = serializer.validated_data.pop("action", "")
        permission = serializer.validated_data.pop("permission", "")

        if name:
            instance.name = name
            self.create_notifications(
                f"You changed the name of the Project: {name}",
                instance,
                self.request.user,
                f"/projects/{instance.pid}/dashboard",
                alt_message=f"{self.request.user} has changed the name of {name} Project",
            )
        if user_email and user_email != user_permision:
            user = User.objects.filter(email=user_email)
            user_instance = User.objects.filter(email=user_permision)
            if user:
                user = user.get()
                user_instance = user_instance.get()
                if (
                    user_instance.permission_set.get(project=instance).permission
                    == Permission.ADMIN_PERMISSION
                ):
                    if action == "add":
                        instance.users.add(
                            user, through_defaults={"permission": permission}
                        )
                        self.create_notifications(
                            f"You added {user.get_username()} as a new member of {instance.name} project, as {permission}.",
                            instance,
                            self.request.user,
                            f"/projects/{instance.pid}/dashboard",
                            alt_message=f"{self.request.user.get_username()} added {user.get_username()} as a new member of MyProject project, as {permission}.",
                        )
                    elif action == "remove":
                        instance.users.remove(user)
                        self.create_notifications(
                            f"You removed {user.get_username()} from {instance.name} project.",
                            instance,
                            self.request.user,
                            f"/projects/{instance.pid}/dashboard",
                            alt_message=f"{self.request.user.get_username()} has removed {user.get_username()} from {instance.name} project.",
                        )
                    elif action == "update":
                        instance.users.remove(user)
                        instance.users.add(
                            user, through_defaults={"permission": permission}
                else:
                    raise ParseError({"error": "Action not supported."})
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
        self.create_notifications(
            f"You deleted {instance.name} project.",
            instance,
            self.request.user,
            f"/projects/",
            alt_message=f"{self.request.user.get_username()} has deleted {instance.name} project.",
        )
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


class NotificationViewSet(BaseViewSet, viewsets.ModelViewSet):
    model_class = Notification
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer

    def get_queryset(self):
        if self.request is None:
            return Notification.objects.none()
        return (
            super(NotificationViewSet, self)
            .get_queryset()
            .filter(
                user__id=self.kwargs["uid"],
            )
        )
