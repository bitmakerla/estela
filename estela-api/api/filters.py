from core.models import SpiderCronJob, SpiderJob
from django_filters import rest_framework as filters


class SpiderJobFilter(filters.FilterSet):
    tag = filters.CharFilter(field_name="tags__name")

    class Meta:
        model = SpiderJob
        fields = ["cronjob", "status", "tag"]


class SpiderCronJobFilter(filters.FilterSet):
    tag = filters.CharFilter(field_name="ctags__name")

    class Meta:
        model = SpiderCronJob
        fields = ["tag"]
