from drf_yasg.utils import swagger_auto_schema
from rest_framework import mixins, status
from rest_framework.response import Response
from drf_yasg import openapi

from api.mixins import BaseViewSet
from api.serializers.spider import SpiderSerializer, SpiderUpdateSerializer
from core.models import Spider


class SpiderViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    BaseViewSet,
):
    model_class = Spider
    serializer_class = SpiderSerializer
    lookup_field = "sid"
    queryset = Spider.objects.all()

    def get_queryset(self):
        queryset = self.model_class.objects.filter(
            project__pid=self.kwargs["pid"], deleted=False
        )
        
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(name__icontains=search)

        return queryset

    @swagger_auto_schema(
        manual_parameters=[
            openapi.Parameter(
                'search',
                openapi.IN_QUERY,
                description='Filter spiders by name (case-insensitive)',
                type=openapi.TYPE_STRING,
                required=False,
            ),
        ],
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @swagger_auto_schema(
        request_body=SpiderUpdateSerializer,
        responses={status.HTTP_200_OK: SpiderUpdateSerializer()},
    )
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = SpiderUpdateSerializer(
            instance, data=request.data, partial=partial
        )
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        if getattr(instance, "_prefetched_objects_cache", None):
            instance._prefetched_objects_cache = {}

        return Response(serializer.data, status=status.HTTP_200_OK)
