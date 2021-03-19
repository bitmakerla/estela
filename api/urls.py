from ***REMOVED***.urls import include, path
from rest_framework.authtoken import views as auth_views

urlpatterns = [
    path('auth/', auth_views.obtain_auth_token),
]
