from django.urls import path
from . import views

urlpatterns = [
    path('upload/', views.FileUploadView.as_view(), name='file-upload'),
    path('files/', views.UploadedFileListView.as_view(), name='file-list'),
    path('files/<int:pk>/', views.UploadedFileDeleteView.as_view(), name='file-delete'),
]
