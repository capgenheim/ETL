from django.urls import path
from . import views

urlpatterns = [
    path('login/', views.login_view, name='auth-login'),
    path('logout/', views.logout_view, name='auth-logout'),
    path('refresh/', views.refresh_token_view, name='auth-refresh'),
    path('me/', views.me_view, name='auth-me'),
    path('me/update/', views.update_profile_view, name='auth-update-profile'),
]
