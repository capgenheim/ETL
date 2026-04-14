from django.urls import path
from . import views

urlpatterns = [
    path('summary/', views.dashboard_summary, name='dashboard-summary'),
    path('audit-trail/', views.audit_trail, name='audit-trail'),
    path('upload-segregate/', views.upload_segregate, name='upload-segregate'),
]
