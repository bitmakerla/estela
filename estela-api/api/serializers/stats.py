from datetime import timedelta
from rest_framework import serializers
from api.serializers.spider import SpiderSerializer
from api.serializers.job import SpiderJobSerializer
from core.models import SpiderJob


class LogsStatsSerializer(serializers.Serializer):
    total_logs = serializers.IntegerField(default=0)
    debug_logs = serializers.IntegerField(default=0)
    info_logs = serializers.IntegerField(default=0)
    warning_logs = serializers.IntegerField(default=0)
    error_logs = serializers.IntegerField(default=0)
    critical_logs = serializers.IntegerField(default=0)


class JobsStatsSerializer(serializers.Serializer):
    total_jobs = serializers.IntegerField(default=0)
    waiting_jobs = serializers.IntegerField(default=0)
    running_jobs = serializers.IntegerField(default=0)
    stopped_jobs = serializers.IntegerField(default=0)
    completed_jobs = serializers.IntegerField(default=0)
    in_queue_jobs = serializers.IntegerField(default=0)
    error_jobs = serializers.IntegerField(default=0)


class PagesStatsSerializer(serializers.Serializer):
    total_pages = serializers.IntegerField(default=0)
    scraped_pages = serializers.IntegerField(default=0)
    missed_pages = serializers.IntegerField(default=0)


class StatusCodesStatsSerializer(serializers.Serializer):
    status_200 = serializers.IntegerField(default=0)
    status_301 = serializers.IntegerField(default=0)
    status_302 = serializers.IntegerField(default=0)
    status_401 = serializers.IntegerField(default=0)
    status_403 = serializers.IntegerField(default=0)
    status_404 = serializers.IntegerField(default=0)
    status_429 = serializers.IntegerField(default=0)
    status_500 = serializers.IntegerField(default=0)


class FieldCoverageStatsSerializer(serializers.Serializer):
    field_name = serializers.CharField(default="")
    field_count = serializers.IntegerField(default=0)
    field_coverage = serializers.FloatField(default=0.0)


class CoverageStatsSerializer(serializers.Serializer):
    total_items = serializers.IntegerField(default=0)
    total_items_coverage = serializers.FloatField(default=0.0)
    fields = FieldCoverageStatsSerializer(many=True, required=False)


class StatsSerializer(serializers.Serializer):
    class HHMMSSDurationField(serializers.DurationField):
        def to_representation(self, value):
            if not isinstance(value, timedelta):
                return super().to_representation(value)

            total_seconds = int(value.total_seconds())
            hours = total_seconds // 3600
            minutes = (total_seconds % 3600) // 60
            seconds = total_seconds % 60

            return f"{hours:02d}:{minutes:02d}:{seconds:02d}"

    jobs = JobsStatsSerializer(required=False)
    pages = PagesStatsSerializer()
    items_count = serializers.IntegerField(default=0)
    runtime = HHMMSSDurationField(default=timedelta(0))
    status_codes = StatusCodesStatsSerializer()
    success_rate = serializers.FloatField(default=0.0, required=False)
    logs = LogsStatsSerializer()
    coverage = CoverageStatsSerializer(required=False)


class SpiderJobStatsSerializer(SpiderJobSerializer):
    stats = StatsSerializer()


class SpiderJobStatsSerializer(SpiderJobSerializer):
    stats = StatsSerializer()

    class Meta:
        model = SpiderJob
        fields = (
            "jid",
            "spider",
            "created",
            "name",
            "lifespan",
            "total_response_bytes",
            "item_count",
            "request_count",
            "args",
            "env_vars",
            "tags",
            "job_status",
            "cronjob",
            "data_expiry_days",
            "data_status",
            "stats",
        )


class ProjectStatsSerializer(serializers.Serializer):
    date = serializers.DateField()
    stats = StatsSerializer()


class SpidersStatsSerializer(ProjectStatsSerializer):
    pass


class SpidersPaginationSerializer(serializers.Serializer):
    count = serializers.IntegerField()
    next = serializers.HyperlinkedIdentityField(
        view_name="project-stats", allow_null=True
    )
    previous = serializers.HyperlinkedIdentityField(
        view_name="project-stats", allow_null=True
    )
    results = SpiderSerializer(many=True)


class JobsPaginationSerializer(serializers.Serializer):
    count = serializers.IntegerField()
    next = serializers.HyperlinkedIdentityField(
        view_name="project-stats", allow_null=True
    )
    previous = serializers.HyperlinkedIdentityField(
        view_name="project-stats", allow_null=True
    )
    results = SpiderJobStatsSerializer(many=True)
