from django.conf import settings
from rest_framework import viewsets
from rest_framework.authentication import TokenAuthentication
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated

from api.permissions import IsProjectUser, IsAdminOrReadOnly


class APIPageNumberPagination(PageNumberPagination):
    page_size_query_param = "page_size"
    page_size = settings.API_PAGE_SIZE
    max_page_size = settings.API_MAX_PAGE_SIZE


class BaseViewSet(viewsets.GenericViewSet):
    """A custom viewset that contains reusable customized settings."""

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated, IsProjectUser, IsAdminOrReadOnly]
    pagination_class = APIPageNumberPagination
