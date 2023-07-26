from api.mixins import BaseViewSet
from api.serializers.notification import (NotificationSerializer,
                                          NotificationUpdateSerializer)
from core.models import Notification
from drf_yasg.utils import swagger_auto_schema
from rest_framework import status, viewsets
from rest_framework.response import Response


class NotificationViewSet(BaseViewSet, viewsets.ModelViewSet):
    model_class = Notification
    serializer_class = NotificationSerializer
    queryset = Notification.objects.all()

    def get_queryset(self):
        if self.request is None:
            return Notification.objects.none()
        return Notification.objects.filter(user=self.request.user).order_by(
            "-activity__created"
        )

    @swagger_auto_schema(
        request_body=NotificationUpdateSerializer,
        responses={status.HTTP_200_OK: NotificationUpdateSerializer()},
    )
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = NotificationUpdateSerializer(
            instance, data=request.data, partial=partial
        )
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        if getattr(instance, "_prefetched_objects_cache", None):
            instance._prefetched_objects_cache = {}

        return Response(serializer.data, status=status.HTTP_200_OK)
