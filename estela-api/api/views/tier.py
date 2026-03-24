from django.shortcuts import get_object_or_404
from drf_yasg.utils import swagger_auto_schema
from rest_framework import mixins, status
from rest_framework.decorators import action
from rest_framework.response import Response

from api.mixins import BaseViewSet
from api.serializers.tier import ResourceTierSerializer
from core.models import Project, ResourceTier
from core.tiers import RESOURCE_TIERS


class ResourceTierViewSet(
    BaseViewSet,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    mixins.ListModelMixin,
):
    serializer_class = ResourceTierSerializer
    lookup_field = "pk"

    def get_queryset(self):
        return ResourceTier.objects.filter(project__pid=self.kwargs["pid"])

    @swagger_auto_schema(
        request_body=ResourceTierSerializer,
        responses={status.HTTP_201_CREATED: ResourceTierSerializer()},
    )
    def create(self, request, *args, **kwargs):
        project = get_object_or_404(Project, pid=self.kwargs["pid"])
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(project=project)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @swagger_auto_schema(
        responses={status.HTTP_200_OK: ResourceTierSerializer(many=True)},
    )
    @action(methods=["GET"], detail=False)
    def available(self, request, *args, **kwargs):
        """Return all tiers available for this project: predefined + custom."""
        predefined = []
        for name, resources in RESOURCE_TIERS.items():
            predefined.append({
                "id": None,
                "name": name,
                "cpu_request": resources["cpu_request"],
                "cpu_limit": resources["cpu_limit"],
                "mem_request": resources["mem_request"],
                "mem_limit": resources["mem_limit"],
            })

        custom = ResourceTierSerializer(
            ResourceTier.objects.filter(project__pid=self.kwargs["pid"]),
            many=True,
        ).data

        return Response(predefined + list(custom), status=status.HTTP_200_OK)
