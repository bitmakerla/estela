from rest_framework import routers

from api.views import (
    project as project_views,
    spider as spider_views,
    job as job_views,
    auth as auth_views,
    cronjob as cronjob_views,
    job_data as job_data_views,
)

router = routers.DefaultRouter(trailing_slash=False)
router.register(
    prefix=r"projects",
    viewset=project_views.ProjectViewSet,
    basename="project",
)
router.register(
    prefix=r"projects/(?P<pid>[0-9a-z-]+)/spiders",
    viewset=spider_views.SpiderViewSet,
    basename="spider",
)
router.register(
    prefix=r"projects/(?P<pid>[0-9a-z-]+)/spiders/(?P<sid>\d+)/jobs",
    viewset=job_views.SpiderJobViewSet,
    basename="job",
)
router.register(
    prefix=r"projects/(?P<pid>[0-9a-z-]+)/spiders/(?P<sid>\d+)/jobs/(?P<jid>\d+)/data",
    viewset=job_data_views.JobDataViewSet,
    basename="job-data",
)
router.register(
    prefix=r"projects/(?P<pid>[0-9a-z-]+)/spiders/(?P<sid>\d+)/cronjobs",
    viewset=cronjob_views.SpiderCronJobViewSet,
    basename="cronjob",
)

router.register(prefix=r"auth", viewset=auth_views.AuthAPIViewSet, basename="auth")

urlpatterns = router.urls
