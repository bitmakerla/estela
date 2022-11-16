from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import mixins, status
from rest_framework.decorators import action
from rest_framework.exceptions import ParseError
from rest_framework.response import Response

from api.filters import SpiderCronJobFilter
from api.mixins import BaseViewSet
from api.serializers.cronjob import (
    SpiderCronJobCreateSerializer,
    SpiderCronJobSerializer,
    SpiderCronJobUpdateSerializer,
)
from core.cronjob import create_cronjob, run_cronjob_once
from core.models import Spider, SpiderCronJob


class SpiderCronJobViewSet(
    BaseViewSet,
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

    def get_days(self, date_str):
        M, D = [int(i) for i in date_str.split("/")]
        return M * 30 + D

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
        data_status = request.data.pop("data_status", SpiderCronJob.PERSISTENT_STATUS)

        if data_status == SpiderCronJob.PENDING_STATUS:
            date_str = request.data.pop("data_expiry_days", "0/1")
            data_expiry_days = self.get_days(date_str)
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
        instance.deleted = True
        instance.save()

    @swagger_auto_schema(
        methods=["GET"], responses={status.HTTP_200_OK: SpiderCronJobSerializer()}
    )
    @action(methods=["GET"], detail=True)
    def run_once(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()

        cronjob = SpiderCronJobSerializer(instance)

        run_cronjob_once(cronjob.data)
        return Response(cronjob.data, status=status.HTTP_200_OK)
