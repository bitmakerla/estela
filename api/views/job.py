from django.shortcuts import get_object_or_404
from drf_yasg.utils import swagger_auto_schema
from rest_framework import mixins, status
from rest_framework.decorators import action
from rest_framework.response import Response

from api import errors
from api.mixins import BaseViewSet
from api.serializers.job import (
    SpiderJobSerializer,
    SpiderJobCreateSerializer,
    SpiderJobUpdateSerializer,
)
from core.kubernetes import delete_job, create_job
from core.models import Spider, SpiderJob


class SpiderJobViewSet(
    BaseViewSet,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.ListModelMixin,
):
    model_class = SpiderJob
    serializer_class = SpiderJobSerializer
    lookup_field = "jid"

    def get_queryset(self):
        return self.model_class.objects.filter(
            spider__project__pid=self.kwargs["pid"],
            spider__sid=self.kwargs["sid"],
            spider__deleted=False,
        )

    @swagger_auto_schema(
        request_body=SpiderJobCreateSerializer,
        responses={status.HTTP_201_CREATED: SpiderJobCreateSerializer()},
    )
    def create(self, request, *args, **kwargs):
        spider = get_object_or_404(Spider, sid=self.kwargs["sid"], deleted=False)
        async_param = request.query_params.get("async", False)
        serializer = SpiderJobCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        job = serializer.save(spider=spider)
        if not async_param:
            job_args = {arg.name: arg.value for arg in job.args.all()}
            job_env_vars = {env_var.name: env_var.value for env_var in job.env_vars.all()}

            token = request.auth.key if request.auth else None
            create_job(
                job.name,
                job.key,
                job.spider.name,
                job_args,
                job_env_vars,
                job.spider.project.container_image,
                job.job_type,
                schedule=job.schedule,
                auth_token=token,
            )
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

        return Response(serializer.data)

    @action(detail=True, methods=["PUT"])
    def stop(self, *args, **kwargs):
        job = self.get_object()
        allowed_status = [
            SpiderJob.WAITING_STATUS,
            SpiderJob.RUNNING_STATUS,
            SpiderJob.ERROR_STATUS,
        ]
        if job.job_status not in allowed_status:
            return Response(
                {"error": errors.JOB_NOT_STOPPED.format(allowed_status)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        response = delete_job(job.name, job_type=job.job_type)
        if response is None:
            return Response(
                {"error": errors.JOB_INSTANCE_NOT_FOUND},
                status=status.HTTP_404_NOT_FOUND,
            )
        job.status = SpiderJob.STOPPED_STATUS
        job.save()
        serializer = self.get_serializer(job)
        return Response(serializer.data)
