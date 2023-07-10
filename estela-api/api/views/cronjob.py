from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import mixins, status
from rest_framework.decorators import action
from rest_framework.exceptions import ParseError
from rest_framework.response import Response

from api.filters import SpiderCronJobFilter
from api.mixins import BaseViewSet, NotificationsHandlerMixin
from api.serializers.cronjob import (
    SpiderCronJobCreateSerializer,
    SpiderCronJobSerializer,
    SpiderCronJobUpdateSerializer,
)
from core.cronjob import create_cronjob, disable_cronjob, run_cronjob_once
from core.models import DataStatus, Spider, SpiderCronJob, Project


class SpiderCronJobViewSet(
    BaseViewSet,
    NotificationsHandlerMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.ListModelMixin,
):
    model_class = SpiderCronJob
    serializer_class = SpiderCronJobSerializer
    lookup_field = "cjid"
    queryset = SpiderCronJob.objects.all()
    filter_backends = [DjangoFilterBackend]
    filterset_class = SpiderCronJobFilter

    def get_queryset(self):
        if self.request is None:
            return SpiderCronJob.objects.none()
        return self.model_class.objects.filter(
            spider__project__pid=self.kwargs["pid"],
            spider__sid=self.kwargs["sid"],
            spider__deleted=False,
            deleted=False,
        )

    @swagger_auto_schema(
        manual_parameters=[
            openapi.Parameter(
                name="tag",
                in_=openapi.IN_QUERY,
                type=openapi.TYPE_STRING,
                required=False,
                description="Cron job tag.",
            ),
        ],
    )
    def list(self, *args, **kwargs):
        return super(SpiderCronJobViewSet, self).list(*args, **kwargs)

    @swagger_auto_schema(
        request_body=SpiderCronJobCreateSerializer,
        responses={status.HTTP_201_CREATED: SpiderCronJobCreateSerializer()},
    )
    def create(self, request, *args, **kwargs):
        spider = get_object_or_404(Spider, sid=self.kwargs["sid"], deleted=False)
        serializer = SpiderCronJobCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data_status = request.data.pop("data_status", DataStatus.PERSISTENT_STATUS)

        if data_status == DataStatus.PENDING_STATUS:
            data_expiry_days = request.data.pop("data_expiry_days", 1)
            if data_expiry_days < 1:
                raise ParseError({"error": "Invalid data expiry days value."})
        else:
            data_expiry_days = None

        cronjob = serializer.save(
            spider=spider,
            data_status=data_status,
            data_expiry_days=data_expiry_days,
        )

        create_cronjob(
            cronjob.name,
            cronjob.key,
            request.data.get("cargs", []),
            request.data.get("cenv_vars", []),
            request.data.get("ctags", []),
            cronjob.schedule,
            data_expiry_days=data_expiry_days,
        )

        # Send notification action
        project = get_object_or_404(Project, pid=self.kwargs["pid"])
        self.save_notification(
            user=request.user,
            message=f"scheduled a new Scheduled-job-{cronjob.cjid} for spider {spider.name}.",
            project=project,
        )

        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data, status=status.HTTP_201_CREATED, headers=headers
        )

    @swagger_auto_schema(
        request_body=SpiderCronJobUpdateSerializer,
        responses={status.HTTP_200_OK: SpiderCronJobUpdateSerializer()},
    )
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        instance = {"object": self.get_object(), "user": request.user}
        serializer = SpiderCronJobUpdateSerializer(
            instance, data=request.data, partial=partial
        )
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        if getattr(instance, "_prefetched_objects_cache", None):
            instance._prefetched_objects_cache = {}

        return Response(serializer.data, status=status.HTTP_200_OK)

    @swagger_auto_schema(
        responses={status.HTTP_204_NO_CONTENT: "Cronjob deleted"},
    )
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)

    def perform_destroy(self, instance):
        instance.status = SpiderCronJob.DISABLED_STATUS
        disable_cronjob(instance.name)
        instance.deleted = True
        instance.save()

    @swagger_auto_schema(
        methods=["GET"], responses={status.HTTP_200_OK: SpiderCronJobSerializer()}
    )
    @action(methods=["GET"], detail=True)
    def run_once(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()

        cronjob = SpiderCronJobSerializer(instance, partial=partial)

        run_cronjob_once(cronjob.data)
        return Response(cronjob.data, status=status.HTTP_200_OK)
