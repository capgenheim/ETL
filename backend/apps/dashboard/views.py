import os
from datetime import timedelta

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.conf import settings
from django.utils import timezone
from django.db.models import Sum

from apps.transformation.models import Package, InboundFileLog


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_summary(request):
    """
    Return dashboard summary data — package stats, run metrics,
    unprocessed file counts, and server time.
    """
    now = timezone.now()
    week_ago = now - timedelta(days=7)

    # Package stats
    total_packages = Package.objects.count()
    active_packages = Package.objects.filter(status='active').count()

    # Run stats (last 7 days)
    recent_logs = InboundFileLog.objects.filter(processed_at__gte=week_ago)
    total_runs_7d = recent_logs.count()
    successful_runs_7d = recent_logs.filter(status='success').count()
    failed_runs_7d = recent_logs.filter(status='failed').count()
    total_rows_7d = recent_logs.aggregate(total=Sum('rows_processed'))['total'] or 0

    last_log = InboundFileLog.objects.first()  # ordered by -processed_at

    # Unprocessed files count
    inbound_dir = settings.TRFM_INBOUND_DIR
    unprocessed_files = 0
    unprocessed_size = 0
    if os.path.exists(inbound_dir):
        for f in os.listdir(inbound_dir):
            fp = os.path.join(inbound_dir, f)
            if os.path.isfile(fp):
                unprocessed_files += 1
                unprocessed_size += os.path.getsize(fp)

    # Recent activity (last 20 run logs)
    recent_activity = [
        {
            'id': log.id,
            'action': f'{"✅" if log.status == "success" else "❌"} {log.original_filename}',
            'detail': f'{log.rows_processed} rows → {log.output_filename or "N/A"}',
            'package': log.package.name if log.package else 'Unknown',
            'status': log.status,
            'run_type': log.run_type,
            'timestamp': log.processed_at.isoformat(),
        }
        for log in InboundFileLog.objects.select_related('package').all()[:20]
    ]

    data = {
        'welcome_message': f'Welcome back, {request.user.first_name or request.user.username}!',
        'user': {
            'email': request.user.email,
            'role': request.user.role,
            'last_login': request.user.last_login,
        },
        'stats': {
            'total_packages': total_packages,
            'active_packages': active_packages,
            'total_runs_7d': total_runs_7d,
            'successful_runs_7d': successful_runs_7d,
            'failed_runs_7d': failed_runs_7d,
            'total_rows_processed_7d': total_rows_7d,
            'last_run_time': last_log.processed_at.isoformat() if last_log else None,
            'last_run_status': last_log.status if last_log else None,
            'server_time': now.isoformat(),
            'unprocessed_files': unprocessed_files,
            'unprocessed_size': unprocessed_size,
        },
        'recent_activity': recent_activity,
    }

    return Response(data)
