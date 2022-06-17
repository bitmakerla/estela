from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from rest_framework import mixins, status
from rest_framework.decorators import action
from rest_framework.response import Response

from api.filters import SpiderCronJobFilter
from api.mixins import BaseViewSet
from api.serializers.cronjob import (
    SpiderCronJobSerializer,
    SpiderCronJobCreateSerializer,
    SpiderCronJobUpdateSerializer,
)
from core.models import Spider, SpiderCronJob
from core.cronjob import create_cronjob, run_cronjob_once


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
    filter_backends = [DjangoFilterBackend]
    filterset_class = SpiderCronJobFilter

    def get_queryset(self):
        if self.request is None:
            return SpiderCronJob.objects.none()
        return self.model_class.objects.filter(
            spider__project__pid=self.kwargs["pid"],
            spider__sid=self.kwargs["sid"],
            spider__deleted=False,
        )

    @swagger_auto_schema(
        manual_parameters=[
            openapi.Parameter(
                name="tag",
                in_=openapi.IN_QUERY,
                type=openapi.TYPE_STRING,
                required=False,
                description="Cronjob tag",
            ),
        ],
    )
    def list(self, *args, **kwargs):
        return super(SpiderCronJobViewSet, self).list(*args, **kwargs)

    @swagger_auto_schema(
        manual_parameters=[
            openapi.Parameter(
                name="persistent", in_=openapi.IN_QUERY, type=openapi.TYPE_BOOLEAN, required=True
            ),
            openapi.Parameter(
                name="data_expiry_date", in_=openapi.IN_QUERY, type=openapi.TYPE_STRING
            )
        ],
        request_body=SpiderCronJobCreateSerializer,
        responses={status.HTTP_201_CREATED: SpiderCronJobCreateSerializer()},
    )
    def create(self, request, *args, **kwargs):
        spider = get_object_or_404(Spider, sid=self.kwargs["sid"], deleted=False)
        serializer = SpiderCronJobCreateSerializer(data=request.data)
        persistent = request.query_params.get("persistent")
        serializer.is_valid(raise_exception=True)
        cronjob = serializer.save(spider=spider)

        if persistent != "true":
            data_expiry_date = request.query_params.get("data_expiry_date")
        else:
            data_expiry_date = None

        create_cronjob(
            cronjob.name,
            cronjob.key,
            request.data.get("cargs", []),
            request.data.get("cenv_vars", []),
            request.data.get("ctags", []),
            cronjob.schedule,
            data_expiry_date=data_expiry_date
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

        return Response(serializer.data)

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
