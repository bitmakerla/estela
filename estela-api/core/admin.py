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
        "spider",
        "cronjob",
        "job",
        "kind",
        "interval_start",
        "interval_end",
        "delta_network_bytes",
        "delta_request_count",
        "delta_item_count",
        "delta_storage_bytes",
        "delta_proxy_bytes",
        "delta_runtime_seconds",
        "proxy_name",
        "idempotency_key",
    )
    list_filter = ("kind", "recorded_at")
    readonly_fields = [f.name for f in MeteredUsageRecord._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(ProxyProvider)
class ProxyProviderAdmin(admin.ModelAdmin):
    pass
