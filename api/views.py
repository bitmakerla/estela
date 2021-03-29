from rest_framework import mixins, viewsets, status
from rest_framework.response import Response

from api.mixins import BaseViewSet
from api.serializers import ProjectSerializer, SpiderSerializer, SpiderJobSerializer
from core.models import Project, Spider, SpiderJob


class ProjectViewSet(BaseViewSet, viewsets.ModelViewSet):
    model_class = Project
    serializer_class = ProjectSerializer
    lookup_field = 'pid'

    def get_queryset(self):
        return self.request.user.project_set.all()

    def perform_create(self, serializer):
        instance = serializer.save()
        instance.users.add(self.request.user)


class SpiderViewSet(BaseViewSet, mixins.CreateModelMixin, mixins.RetrieveModelMixin, mixins.ListModelMixin,
                    mixins.DestroyModelMixin):
    model_class = Spider
    serializer_class = SpiderSerializer
    lookup_field = 'sid'

    def get_queryset(self):
        queryset = super(SpiderViewSet, self).get_queryset()
        return queryset.filter(project__pid=self.kwargs['pid'])

    def create(self, request, *args, **kwargs):
        data = request.data
        data['project'] = self.kwargs['pid']
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


class SpiderJobViewSet(BaseViewSet, mixins.CreateModelMixin, mixins.RetrieveModelMixin, mixins.ListModelMixin):
    model_class = SpiderJob
    serializer_class = SpiderJobSerializer
    lookup_field = 'jid'

    def get_queryset(self):
        queryset = super(SpiderJobViewSet, self).get_queryset()
        return queryset.filter(spider__project__pid=self.kwargs['pid'], spider__sid=self.kwargs['sid'])

    def create(self, request, *args, **kwargs):
        data = request.data
        data['spider'] = self.kwargs['sid']
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
