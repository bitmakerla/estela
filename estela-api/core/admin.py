from core.models import (
    MeteredUsageRecord,
    Permission,
    Project,
    ProxyProvider,
    Spider,
    SpiderJob,
    SpiderJobArg,
    SpiderJobEnvVar,
    UsageRecord,
)
from django.contrib import admin


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    pass


@admin.register(Permission)
class PermissionAdmin(admin.ModelAdmin):
    pass


@admin.register(Spider)
class SpiderAdmin(admin.ModelAdmin):
    pass


class SpiderJobArgInline(admin.TabularInline):
    model = SpiderJobArg


class SpiderJobEnvVarInline(admin.TabularInline):
    model = SpiderJobEnvVar


@admin.register(SpiderJob)
class SpiderJobAdmin(admin.ModelAdmin):
    inlines = [
        SpiderJobArgInline,
        SpiderJobEnvVarInline,
    ]


@admin.register(UsageRecord)
class UsageRecordAdmin(admin.ModelAdmin):
    pass


@admin.register(MeteredUsageRecord)
class MeteredUsageRecordAdmin(admin.ModelAdmin):
    list_display = (
        "recorded_at",
        "project",
        "reporter",
        "resource_kind",
        "resource_id",
        "kind",
        "interval_start",
        "interval_end",
        "metrics_summary",
        "idempotency_key",
    )
    list_filter = ("kind", "resource_kind", "reporter", "recorded_at")
    search_fields = ("resource_id", "idempotency_key", "source_ref")
    readonly_fields = [f.name for f in MeteredUsageRecord._meta.fields]

    def metrics_summary(self, obj):
        if not obj.metrics:
            return "—"
        parts = [f"{k}={v}" for k, v in sorted(obj.metrics.items())]
        text = ", ".join(parts)
        return text if len(text) <= 120 else text[:117] + "…"

    metrics_summary.short_description = "metrics"

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(ProxyProvider)
class ProxyProviderAdmin(admin.ModelAdmin):
    pass
