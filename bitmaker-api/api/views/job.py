from ***REMOVED***.shortcuts import get_object_or_404
from ***REMOVED***_filters.rest_framework import DjangoFilterBackend
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from rest_framework import mixins, status
from rest_framework.decorators import action
from rest_framework.response import Response

from api.filters import SpiderJobFilter
from api.mixins import BaseViewSet
from api.serializers.job import (
    SpiderJobSerializer,
    SpiderJobCreateSerializer,
    SpiderJobUpdateSerializer,
)
from config.job_manager import job_manager
from core.models import Spider, SpiderJob


class SpiderJobViewSet(
    BaseViewSet,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.ListModelMixin,
):
    model_class = SpiderJob
    queryset = SpiderJob.objects.all()
    serializer_class = SpiderJobSerializer
    lookup_field = "jid"
    filter_backends = [DjangoFilterBackend]
    filterset_class = SpiderJobFilter

    def get_queryset(self):
        if self.request is None:
            return SpiderJob.objects.none()
        return (
            super(SpiderJobViewSet, self)
            .get_queryset()
            .filter(
                spider__project__pid=self.kwargs["pid"],
                spider__sid=self.kwargs["sid"],
                spider__deleted=False,
            )
        )

    @swagger_auto_schema(
        manual_parameters=[
            openapi.Parameter(
                name="cronjob",
                in_=openapi.IN_QUERY,
                type=openapi.TYPE_NUMBER,
                required=False,
                description="Cronjob",
            ),
            openapi.Parameter(
                name="status",
                in_=openapi.IN_QUERY,
                type=openapi.TYPE_STRING,
                required=False,
                description="Job status",
            ),
            openapi.Parameter(
                name="tag",
                in_=openapi.IN_QUERY,
                type=openapi.TYPE_STRING,
                required=False,
                description="Job tag",
            ),
        ],
    )
    def list(self, *args, **kwargs):
        return super(SpiderJobViewSet, self).list(*args, **kwargs)

    @swagger_auto_schema(
        manual_parameters=[
            openapi.Parameter(
                name="async", in_=openapi.IN_QUERY, type=openapi.TYPE_BOOLEAN
            )
        ],
        request_body=SpiderJobCreateSerializer,
        responses={status.HTTP_201_CREATED: SpiderJobCreateSerializer()},
    )
    def create(self, request, *args, **kwargs):
        spider = get_object_or_404(Spider, sid=self.kwargs["sid"], deleted=False)
        async_param = request.query_params.get("async", False)
        serializer = SpiderJobCreateSerializer(data=request.data)

        serializer.is_valid(raise_exception=True)

        if not async_param:
            job = serializer.save(spider=spider)
            job_args = {arg.name: arg.value for arg in job.args.all()}
            job_env_vars = {
                env_var.name: env_var.value for env_var in job.env_vars.all()
            }

            token = request.auth.key if request.auth else None
            job_manager.create_job(
                job.name,
                job.key,
                job.spider.name,
                job_args,
                job_env_vars,
                job.spider.project.container_image,
                auth_token=token,
            )
        else:
            serializer.save(spider=spider, status=SpiderJob.IN_QUEUE_STATUS)
        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data, status=status.HTTP_201_CREATED, headers=headers
        )

    @swagger_auto_schema(
        request_body=SpiderJobUpdateSerializer,
        responses={status.HTTP_200_OK: SpiderJobUpdateSerializer()},
    )
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = SpiderJobUpdateSerializer(
            instance, data=request.data, partial=partial
        )
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        if getattr(instance, "_prefetched_objects_cache", None):
            instance._prefetched_objects_cache = {}

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_200_OK, headers=headers)
