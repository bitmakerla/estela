from ***REMOVED***.contrib import admin
from core.models import Project, Spider, SpiderJob, SpiderJobArg


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    pass


@admin.register(Spider)
class SpiderAdmin(admin.ModelAdmin):
    pass


class SpiderJobArgInline(admin.TabularInline):
    model = SpiderJobArg


@admin.register(SpiderJob)
class SpiderJobAdmin(admin.ModelAdmin):
    inlines = [
        SpiderJobArgInline,
    ]
