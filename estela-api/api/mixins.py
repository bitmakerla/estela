from django.conf import settings
from rest_framework import viewsets
from rest_framework.authentication import TokenAuthentication
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated

from api.permissions import IsProjectUser, IsOwnerOrReadOnly


class APIPageNumberPagination(PageNumberPagination):
    page_size_query_param = "page_size"
    page_size = settings.API_PAGE_SIZE
    max_page_size = settings.API_MAX_PAGE_SIZE

    def get_paginated_response_schema(self, schema):
        return {
            "type": "object",
            "properties": {
                "count": {
                    "type": "integer",
                    "description": "Current page result count.",
                },
                "next": {
                    "type": "string",
                    "nullable": True,
                    "format": "uri",
                    "description": "URI to the next page of results.",
                },
                "previous": {
                    "type": "string",
                    "nullable": True,
                    "format": "uri",
                    "description": "URI to the previous page of results.",
                },
                "results": schema,
            },
        }


class BaseViewSet(viewsets.GenericViewSet):
    """A custom viewset that contains reusable customized settings."""

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated, IsProjectUser, IsOwnerOrReadOnly]
    pagination_class = APIPageNumberPagination
