from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from api.mixins import BaseViewSet
from api.serializers.project import ProjectSerializer, ProjectUpdateSerializer
from api.serializers.job import SpiderJobSerializer, ProjectJobSerializer
from core.models import Project, User, Permission, Spider, SpiderJob


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
        request_body=ProjectUpdateSerializer,
        responses={status.HTTP_200_OK: ProjectUpdateSerializer()},
    )
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = ProjectUpdateSerializer(
            instance, data=request.data, partial=partial
        )
        serializer.is_valid(raise_exception=True)

        name = serializer.validated_data.get("name", "")
        user_email = serializer.validated_data.pop("email", "")
        action = serializer.validated_data.pop("action", "")
        permission = serializer.validated_data.pop("permission", "")

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
        serializer.save()

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_200_OK, headers=headers)

    @swagger_auto_schema(
        methods=["GET"],
        manual_parameters=[
            openapi.Parameter(
                "page",
                openapi.IN_QUERY,
                description="DataPaginated.",
                type=openapi.TYPE_NUMBER,
                required=False,
            ),
            openapi.Parameter(
                "page_size",
                openapi.IN_QUERY,
                description="DataPaginated.",
                type=openapi.TYPE_NUMBER,
                required=False,
            ),
        ],
        responses={status.HTTP_200_OK: ProjectJobSerializer()},
    )
    @action(methods=["GET"], detail=True)
    def jobs(self, request, *args, **kwargs):
        spider_set = Spider.objects.filter(project=kwargs["pid"])
        sid_set = spider_set.values_list("pk", flat=True)
        jobs_set = SpiderJob.objects.filter(spider__in=sid_set)
        page = self.paginate_queryset(jobs_set)
        
        if page is not None:
            result = SpiderJobSerializer(page, many=True)
        else:
            result = SpiderJobSerializer(jobs_set, many=True)
        return Response({"result": result.data, "count": len(jobs_set)}, status=status.HTTP_200_OK)
