"""
URL configuration for ETL Platform.
"""
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    # Admin site (SuperAdmin/Admin access)
    path('admin/', admin.site.urls),

    # OAuth2 provider endpoints
    path('o/', include('oauth2_provider.urls', namespace='oauth2_provider')),

    # API routes
    path('api/auth/', include('apps.accounts.urls')),
    path('api/dashboard/', include('apps.dashboard.urls')),
]
