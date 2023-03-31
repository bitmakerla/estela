from rest_framework import viewsets

from api.mixins import BaseViewSet
from core.models import Notification, Project

from api.serializers.notification import NotificationSerializer


class NotificationViewSet(BaseViewSet, viewsets.ReadOnlyModelViewSet):
    model_class = Notification
    serializer_class = NotificationSerializer
    lookup_field = "nid"
    queryset = Notification.objects.all()

    def get_queryset(self):
        if self.request is None:
            return Notification.objects.none()
        projects = Project.objects.filter(users__in=[self.request.user.id], deleted=False)
        return (
            super(NotificationViewSet, self).get_queryset().filter(project__in=projects)
        )
