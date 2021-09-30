from ***REMOVED***.shortcuts import get_object_or_404
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from rest_framework import mixins, status
from rest_framework.decorators import action
from rest_framework.response import Response

from api import errors
from api.mixins import BaseViewSet
from api.serializers.cronjob import (
    SpiderCronJobSerializer,
    SpiderCronJobCreateSerializer,
)
from core.models import Spider, SpiderCronJob
from core.cronjob import create_cronjob, delete_cronjob


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

    def get_queryset(self):
        return self.model_class.objects.filter(
            spider__project__pid=self.kwargs["pid"],
            spider__sid=self.kwargs["sid"],
            spider__deleted=False,
        )

    @swagger_auto_schema(
        manual_parameters=[openapi.Parameter(name="async",in_=openapi.IN_QUERY,type=openapi.TYPE_STRING)],
        request_body=SpiderCronJobCreateSerializer,
        responses={status.HTTP_201_CREATED: SpiderCronJobCreateSerializer()},
    )
    def create(self, request, *args, **kwargs):
        spider = get_object_or_404(Spider, sid=self.kwargs["sid"], deleted=False)
        async_param = request.query_params.get("async", False)
        serializer = SpiderCronJobCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        cronjob = serializer.save(spider=spider)
        if not async_param:
            token = request.auth.key if request.auth else None
            create_cronjob(
                cronjob.key,
                request.data["cargs"],
                request.data["cenv_vargs"],
                schedule=cronjob.schedule,
                auth_token=token,
            )
        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data, status=status.HTTP_201_CREATED, headers=headers
        )

    @action(detail=True, methods=["PUT"])
    def stop(self, *args, **kwargs):
        cjob = self.get_object()
        response = delete_cronjob(cjob.key)
        if response is None:
            return Response(
                {"error": errors.JOB_INSTANCE_NOT_FOUND},
                status=status.HTTP_404_NOT_FOUND,
            )
        cjob.status = SpiderCronJob.DISABLED_STATUS
        cjob.save()
        serializer = self.get_serializer(cjob)
        return Response(serializer.data)
