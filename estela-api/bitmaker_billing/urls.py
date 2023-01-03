from rest_framework import routers

from api.views import (
    project as project_views,
)

router = routers.DefaultRouter(trailing_slash=False)
router.register(
    prefix=r"projects",
    viewset=project_views.ProjectViewSet,
    basename="billing",
)

urlpatterns = router.urls
