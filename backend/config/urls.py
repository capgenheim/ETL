"""
URL configuration for ETL Platform.
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include
from apps.dashboard.admin_views import ApiDocumentationView

urlpatterns = [
    # Custom admin views (before admin.site.urls)
    path('admin/api-docs/', ApiDocumentationView.as_view(), name='admin-api-docs'),

    # Admin site (SuperAdmin/Admin access)
    path('admin/', admin.site.urls),

    # OAuth2 provider endpoints
    path('o/', include('oauth2_provider.urls', namespace='oauth2_provider')),

    # API routes
    path('api/auth/', include('apps.accounts.urls')),
    path('api/dashboard/', include('apps.dashboard.urls')),
    path('api/transformation/', include('apps.transformation.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
