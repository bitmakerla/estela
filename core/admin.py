from ***REMOVED***.contrib import admin
from core.models import Project, Spider, SpiderJob


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    pass


@admin.register(Spider)
class SpiderAdmin(admin.ModelAdmin):
    pass


@admin.register(SpiderJob)
class SpiderJobAdmin(admin.ModelAdmin):
    pass
