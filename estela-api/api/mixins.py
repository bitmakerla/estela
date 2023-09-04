from django.conf import settings
from rest_framework import viewsets
from rest_framework.authentication import TokenAuthentication
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated

from api.permissions import IsAdminOrReadOnly, IsProjectUser
from core.models import Notification, Activity


class APIPageNumberPagination(PageNumberPagination):
    page_size_query_param = "page_size"
    page_size = settings.API_PAGE_SIZE
    max_page_size = settings.API_MAX_PAGE_SIZE


class BaseViewSet(viewsets.GenericViewSet):
    """A custom viewset that contains reusable customized settings."""

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated, IsProjectUser, IsAdminOrReadOnly]
    pagination_class = APIPageNumberPagination


class ActionHandlerMixin:
    def save_action(self, user, description, project):
        activity = Activity.objects.create(
            user=user, project=project, description=description
        )

        users_to_notify = project.users.exclude(id=user.id)

        notifications = [
            Notification(user=_user, activity=activity) for _user in users_to_notify
        ]
        Notification.objects.bulk_create(notifications)
