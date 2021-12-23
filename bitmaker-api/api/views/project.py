from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import NotFound

from api.mixins import BaseViewSet
from api.serializers.project import (
    ProjectSerializer,
    ProjectUpdateSerializer,
    SetRelatedSpidersProjectSerializer,
)
from core.models import Project, User, Permission
from django.forms.models import model_to_dict


class ProjectViewSet(BaseViewSet, viewsets.ModelViewSet):
    model_class = Project
    serializer_class = ProjectSerializer
    lookup_field = "pid"

    def get_queryset(self):
        return self.request.user.project_set.all()

    def perform_create(self, serializer):
        instance = serializer.save()
        instance.users.add(
            self.request.user,
            through_defaults={"permission": Permission.OWNER_PERMISSION},
        )

    @swagger_auto_schema(
        operation_summary="Update Project information",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                "name": openapi.Schema(
                    type=openapi.TYPE_STRING,
                    description="Project Name",
                ),
                "email": openapi.Schema(
                    type=openapi.TYPE_STRING, description="User's email"
                ),
                "action": openapi.Schema(
                    type=openapi.TYPE_STRING, description="Action to perform"
                ),
                "permission": openapi.Schema(
                    type=openapi.TYPE_STRING, description="Type of permission"
                ),
            },
            required=["name"],
        ),
    )
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        user_email = self.request.data.get("email", "")
        action = self.request.data.get("action", "")
        permission = self.request.data.get("permission", "")
        name = self.request.data.get("name", "")
        if name:
            instance.name = name
        if user_email:
            user = User.objects.filter(email=user_email)
            if user:
                user = user.get()
                if action == "add":
                    instance.users.add(
                        user, through_defaults={"permission": permission}
                    )
                elif action == "remove":
                    if (
                        user.permission_set.get(project=instance).permission
                        != Permission.OWNER_PERMISSION
                    ):
                        instance.users.remove(user)
                    else:
                        return Response(
                            {"error": "User cannot be removed."},
                            status=status.HTTP_403_FORBIDDEN,
                        )
            else:
                return Response(
                    {"email": "User does not exist."}, status=status.HTTP_204_NO_CONTENT
                )
        instance.save()
        serializer = ProjectSerializer(instance)
        return Response(serializer.data)

    @swagger_auto_schema(
        request_body=SetRelatedSpidersProjectSerializer,
        responses={status.HTTP_200_OK: SetRelatedSpidersProjectSerializer()},
    )
    @action(methods=["PUT"], detail=True)
    def set_related_spiders(self, request, *args, **kwargs):
        project = self.get_object()
        serializer = SetRelatedSpidersProjectSerializer(
            data=request.data, context={"project": project}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
