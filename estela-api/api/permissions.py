from rest_framework.permissions import BasePermission, SAFE_METHODS
from core.models import Project, Permission


class IsProjectUser(BasePermission):
    def has_permission(self, request, view):
        if request.user.is_superuser:
            return True
        pid = view.kwargs.get("pid")
        return bool(
            pid is None
            or Project.objects.filter(pid=pid, users__in=[request.user]).exists()
        )


class IsAdminOrReadOnly(BasePermission):
    """
    Custom permission to only allow admins or developers of an object to edit it.
    """

    def has_permission(self, request, view):
        pid = view.kwargs.get("pid")
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in SAFE_METHODS:
            return True
        # In case the project is just going to be created.
        if pid is None:
            return True
        if request.user.is_superuser:
            return True
        # Write permissions are only allowed to the admin of the snippet.
        project = Project.objects.filter(pid=pid).get()
        user_permission = request.user.permission_set.get(project=project)
        if user_permission.permission in [
            Permission.DEVELOPER_PERMISSION,
            Permission.ADMIN_PERMISSION,
        ]:
            return True
        return False
