from django.urls import path
from . import views
from . import views_file_manager as fm_views
from . import views_swift as swift_views
from . import views_swift_messages as swift_msg_views
from . import views_swift_packages as swift_pkg_views

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

    # Ad-hoc run & run logs (MUST come before the <str:action> catch-all)
    path('packages/<int:pk>/adhoc-run/', views.AdHocRunView.as_view(), name='package-adhoc-run'),
    path('packages/<int:pk>/run-logs/', views.RunLogView.as_view(), name='package-run-logs'),

    # Package detail (retrieve/update/delete)
    path('packages/<int:pk>/', views.PackageDetailView.as_view(), name='package-detail'),

    # Package status control (start/pause/stop)
    path('packages/<int:pk>/<str:action>/', views.PackageStatusView.as_view(), name='package-status'),

    # ── File Manager (processed files from DB) ──
    path('file-manager/', fm_views.FileManagerListView.as_view(), name='file-manager-list'),
    path('file-manager/<int:pk>/download/', fm_views.FileManagerDownloadView.as_view(), name='file-manager-download'),

    # ── Unprocessed Files (inbound queue from filesystem) ──
    path('unprocessed/', fm_views.UnprocessedListView.as_view(), name='unprocessed-list'),
    path('unprocessed/download/<str:filename>/', fm_views.UnprocessedDownloadView.as_view(), name='unprocessed-download'),
    path('unprocessed/delete/<str:filename>/', fm_views.UnprocessedDeleteView.as_view(), name='unprocessed-delete'),

    # ── SWIFT Parameters ──
    path('swift-params/', swift_views.SwiftParameterListCreateView.as_view(), name='swift-param-list'),
    path('swift-params/export/', swift_views.SwiftParameterExportView.as_view(), name='swift-param-export'),
    path('swift-params/import/', swift_views.SwiftParameterImportView.as_view(), name='swift-param-import'),
    path('swift-params/<int:pk>/', swift_views.SwiftParameterDetailView.as_view(), name='swift-param-detail'),

    # ── SWIFT Messages ──
    path('swift-messages/', swift_msg_views.SwiftMessageListView.as_view(), name='swift-msg-list'),
    path('swift-messages/upload/', swift_msg_views.SwiftMessageUploadView.as_view(), name='swift-msg-upload'),
    path('swift-messages/<int:pk>/', swift_msg_views.SwiftMessageDetailView.as_view(), name='swift-msg-detail'),
    path('swift-messages/<int:pk>/download/', swift_msg_views.SwiftMessageDownloadView.as_view(), name='swift-msg-download'),

    # ── SWIFT Packages ──
    path('swift-packages/', swift_pkg_views.SwiftPackageListView.as_view(), name='swift-pkg-list'),
    path('swift-packages/types/', swift_pkg_views.SwiftPackageTypesView.as_view(), name='swift-pkg-types'),
    path('swift-packages/<int:pk>/', swift_pkg_views.SwiftPackageDetailView.as_view(), name='swift-pkg-detail'),
]
