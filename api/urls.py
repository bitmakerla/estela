from django.urls import re_path
from rest_framework import routers
from rest_framework.authtoken import views as auth_views

from api import views

router = routers.DefaultRouter(trailing_slash=False)
router.register(
    prefix=r"projects",
    viewset=views.ProjectViewSet,
    basename="project",
)
router.register(
    prefix=r"projects/(?P<pid>[0-9a-z-]+)/spiders",
    viewset=views.SpiderViewSet,
    basename="spider",
)
router.register(
    prefix=r"projects/(?P<pid>[0-9a-z-]+)/spiders/(?P<sid>\d+)/jobs",
    viewset=views.SpiderJobViewSet,
    basename="job",
)

urlpatterns = [
    re_path(r"login/", auth_views.obtain_auth_token),
] + router.urls
