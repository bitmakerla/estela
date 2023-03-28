from django.conf import settings
from django.core.mail import EmailMessage
from rest_framework import viewsets
from rest_framework.authentication import TokenAuthentication
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated

from api.permissions import IsProjectUser, IsAdminOrReadOnly
from core.models import Notification


class APIPageNumberPagination(PageNumberPagination):
    page_size_query_param = "page_size"
    page_size = settings.API_PAGE_SIZE
    max_page_size = settings.API_MAX_PAGE_SIZE


class BaseViewSet(viewsets.GenericViewSet):
    """A custom viewset that contains reusable customized settings."""

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated, IsProjectUser, IsAdminOrReadOnly]
    pagination_class = APIPageNumberPagination


class NotificationsHandler(viewsets.GenericViewSet):
    def get_users_email(self, project):
        email_list = []
        for user in project.users.all():
            email_list.append(user.email)

        return email_list

    def save_notification(self, user, message, project):
        email_list = self.get_users_email(project)
        email_body = f"""
        Dear User
        {message}

        Estela Notification Service.
        """
        notification = Notification(
            message=message,
            user=user,
            notify_to=", ".join(email_list),
        )
        notification.save()
        email = EmailMessage(
            subject=f"NO REPLY: Notification alert on {project.name} project.",
            body=email_body,
            from_email=settings.VERIFICATION_EMAIL,
            to=email_list,
        )
        email.send()
