import uuid

from rest_framework.permissions import BasePermission, SAFE_METHODS
from django.contrib.auth.models import User

from core.models import ApiKey, Project, Permission


class HasApiKeyScope(BasePermission):
    """Narrows what an API key may do. Sessions are unaffected.

    A key reads whatever its owner can read, unless the view asks for a scope.
    Writing always needs a scope, so a view that declares none is session-only.
    """

    message = "This API key does not have the required scope."

    def has_permission(self, request, view):
        api_key = request.auth
        if not isinstance(api_key, ApiKey):
            return True

        if request.method in SAFE_METHODS:
            required = getattr(view, "api_key_read_scope", None)
            return required is None or api_key.has_scope(required)

        required = getattr(view, "api_key_write_scope", None)
        return required is not None and api_key.has_scope(required)


class IsSessionAuthenticated(BasePermission):
    """Blocks API keys outright, for anything only a person should do."""

    message = "This action requires a login session, not an API key."

    def has_permission(self, request, view):
        return not isinstance(request.auth, ApiKey)


class IsProjectUser(BasePermission):
    def has_permission(self, request, view):
        if request.user.is_superuser or request.user.is_staff:
            return True
        pid = view.kwargs.get("pid")
        return bool(
            pid is None
            or Project.objects.filter(pid=pid, users__in=[request.user]).exists()
        )


class IsProfileUser(BasePermission):
    def has_permission(self, request, view):
        if request.user.is_superuser:
            return True
        username = view.kwargs.get("username")
        return bool(
            username is None
            or User.objects.filter(username=username, id=request.user.id).exists()
        )


class CanReportMeteringForProject(BasePermission):
    """Allow metering ingest when the caller can access the target project."""

    def has_permission(self, request, view):
        if request.user.is_superuser or request.user.is_staff:
            return True
        project_id = request.data.get("project_id")
        if not project_id:
            return False
        try:
            project_id = uuid.UUID(str(project_id))
        except (AttributeError, TypeError, ValueError):
            return False
        return Project.objects.filter(pid=project_id, users__in=[request.user]).exists()


class IsAdminOrReadOnly(BasePermission):
    """
    Custom permission to only allow admins or developers of an object to edit it.
    """

    # Named so it cannot be mistaken for the API key's own refusal: a key with the
    # right scope still gets nowhere if its owner is a viewer on the project.
    message = "Your role on this project does not allow this action."

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
        try:
            user_permission = request.user.permission_set.get(project=project)
            if user_permission.permission in [
                Permission.DEVELOPER_PERMISSION,
                Permission.ADMIN_PERMISSION,
                Permission.OWNER_PERMISSION,
            ]:
                return True
        except Permission.DoesNotExist:
            return False
        return False
