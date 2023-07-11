"""estela URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/3.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.conf import settings
from django.contrib import admin
from django.urls import include, path

django_external_apps_url = []
for external_app in settings.DJANGO_EXTERNAL_APPS:
    django_external_apps_url.append(
        path(f"{external_app}/", include(f"{external_app}.urls"))
    )

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("api.urls")),
]
urlpatterns = urlpatterns + django_external_apps_url
