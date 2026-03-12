from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from apps.accounts.models import User


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_summary(request):
    """
    Return dashboard summary data for the authenticated user.
    """
    total_users = User.objects.count()
    active_users = User.objects.filter(is_active=True).count()

    data = {
        'welcome_message': f'Welcome back, {request.user.first_name or request.user.username}!',
        'user': {
            'email': request.user.email,
            'role': request.user.role,
            'last_login': request.user.last_login,
        },
        'stats': {
            'total_users': total_users,
            'active_users': active_users,
            'system_status': 'operational',
            'server_time': timezone.now().isoformat(),
        },
        'recent_activity': [],
    }

    return Response(data)
