from drf_yasg.utils import swagger_auto_schema
from rest_framework import status, viewsets
from rest_framework.response import Response

from api.mixins import BaseViewSet
from api.serializers.notification import (
    UserNotificationSerializer,
    UserNotificationUpdateSerializer,
)
from core.models import UserNotification


class UserNotificationViewSet(BaseViewSet, viewsets.ModelViewSet):
    model_class = UserNotification
    serializer_class = UserNotificationSerializer
    queryset = UserNotification.objects.all()

    def get_queryset(self):
        if self.request is None:
            return UserNotification.objects.none()
        return UserNotification.objects.filter(user=self.request.user)

    @swagger_auto_schema(
        request_body=UserNotificationUpdateSerializer,
        responses={status.HTTP_200_OK: UserNotificationUpdateSerializer()},
    )
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = UserNotificationUpdateSerializer(
            instance, data=request.data, partial=partial
        )
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        if getattr(instance, "_prefetched_objects_cache", None):
            instance._prefetched_objects_cache = {}

        return Response(serializer.data, status=status.HTTP_200_OK)
