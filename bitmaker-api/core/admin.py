from ***REMOVED***.contrib import admin
from core.models import Project, Spider, SpiderJob, SpiderJobArg, SpiderJobEnvVar


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
