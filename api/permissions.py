from rest_framework.permissions import BasePermission
from core.models import Project


class IsProjectUser(BasePermission):
    def has_project_permission(self, request, view):
        pid = view.kwargs.get("pid")
        return bool(
            pid is None
            or Project.objects.filter(pid=pid, users__in=request.user).exists()
        )
