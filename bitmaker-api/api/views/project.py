from drf_yasg.utils import swagger_auto_schema
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from api.mixins import BaseViewSet
from api.serializers.project import (
    ProjectSerializer,
    SetRelatedSpidersProjectSerializer,
)
from core.models import Project


class ProjectViewSet(BaseViewSet, viewsets.ModelViewSet):
    model_class = Project
    serializer_class = ProjectSerializer
    lookup_field = "pid"

    def get_queryset(self):
        return self.request.user.project_set.all()

    def perform_create(self, serializer):
        instance = serializer.save()
        instance.users.add(self.request.user)

    @swagger_auto_schema(
        request_body=SetRelatedSpidersProjectSerializer,
        responses={status.HTTP_200_OK: SetRelatedSpidersProjectSerializer()},
    )
    @action(methods=["PUT"], detail=True)
    def set_related_spiders(self, request, *args, **kwargs):
        project = self.get_object()
        serializer = SetRelatedSpidersProjectSerializer(
            data=request.data, context={"project": project}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
