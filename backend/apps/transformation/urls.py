from django.urls import path
from . import views

urlpatterns = [
    # File upload & management
    path('upload/', views.FileUploadView.as_view(), name='file-upload'),
    path('files/', views.UploadedFileListView.as_view(), name='file-list'),
    path('files/<int:pk>/', views.UploadedFileDeleteView.as_view(), name='file-delete'),

    # Package CRUD
    path('packages/', views.PackageListView.as_view(), name='package-list'),
    path('packages/create/', views.PackageCreateView.as_view(), name='package-create'),

    # Field mappings (MUST come before the <str:action> catch-all)
    path('packages/<int:pk>/mappings/', views.FieldMappingListView.as_view(), name='field-mapping-list'),

    # Package detail (retrieve/update/delete)
    path('packages/<int:pk>/', views.PackageDetailView.as_view(), name='package-detail'),

    # Package status control (start/pause/stop)
    path('packages/<int:pk>/<str:action>/', views.PackageStatusView.as_view(), name='package-status'),
]
