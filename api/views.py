from rest_framework import mixins, viewsets, status
from rest_framework.response import Response

from api.mixins import BaseViewSet
from api.serializers import ProjectSerializer, SpiderSerializer, SpiderJobSerializer
from core.models import Project, Spider, SpiderJob
from core.kubernetes import delete_job, create_job


class ProjectViewSet(BaseViewSet, viewsets.ModelViewSet):
    model_class = Project
    serializer_class = ProjectSerializer
    lookup_field = "pid"

    def get_queryset(self):
        return self.request.user.project_set.all()

    def perform_create(self, serializer):
        instance = serializer.save()
        instance.users.add(self.request.user)


class SpiderViewSet(
    BaseViewSet,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.ListModelMixin,
    mixins.DestroyModelMixin,
):
    model_class = Spider
    serializer_class = SpiderSerializer
    lookup_field = "sid"

    def get_queryset(self):
        queryset = super(SpiderViewSet, self).get_queryset()
        return queryset.filter(project__pid=self.kwargs["pid"])

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(project_id=self.kwargs["pid"])
        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data, status=status.HTTP_201_CREATED, headers=headers
        )


class SpiderJobViewSet(
    BaseViewSet,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.ListModelMixin,
    mixins.DestroyModelMixin,
):
    model_class = SpiderJob
    serializer_class = SpiderJobSerializer
    lookup_field = "jid"

    def get_queryset(self):
        queryset = super(SpiderJobViewSet, self).get_queryset()
        return queryset.filter(
            spider__project__pid=self.kwargs["pid"], spider__sid=self.kwargs["sid"]
        )

    def create(self, request, *args, **kwargs):
        async_param = request.query_params.get("async", False)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if async_param:
            serializer.save(spider_id=int(self.kwargs["sid"]))
        else:
            job = serializer.save(
                spider_id=int(self.kwargs["sid"]), status=SpiderJob.RUNNING_STATUS
            )
            job_args = {arg.name: arg.value for arg in job.args.all()}
            create_job(
                job.name,
                job.spider.name,
                job_args,
                job.spider.project.container_image,
                job.job_type,
                schedule=job.schedule,
            )
        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data, status=status.HTTP_201_CREATED, headers=headers
        )

    def destroy(self, request, *args, **kwargs):
        job = self.get_object()
        if job.status in (SpiderJob.RUNNING_STATUS, SpiderJob.COMPLETED_STATUS):
            delete_job(job.name)
        self.perform_destroy(job)
        return Response(status=status.HTTP_204_NO_CONTENT)
