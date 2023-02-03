from django.contrib import admin

from core.models import (
    Project,
    Spider,
    SpiderJob,
    SpiderJobArg,
    SpiderJobEnvVar,
    UsageRecord,
    Permission,
)


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
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
