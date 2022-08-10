from rest_framework import viewsets

from api.mixins import BaseViewSet
from api.serializers.spider import SpiderSerializer
from core.models import Spider


class SpiderViewSet(BaseViewSet, viewsets.ReadOnlyModelViewSet):
    model_class = Spider
    serializer_class = SpiderSerializer
    lookup_field = "sid"
    queryset = Spider.objects.all()

    def get_queryset(self):
        return self.model_class.objects.filter(
            project__pid=self.kwargs["pid"], deleted=False
        )
