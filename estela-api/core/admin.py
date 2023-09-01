from core.models import (Project, ProxyProvider, Spider, SpiderJob,
                         SpiderJobArg, SpiderJobEnvVar, UsageRecord)
from django.contrib import admin


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


@admin.register(ProxyProvider)
class ProxyProviderAdmin(admin.ModelAdmin):
    pass
