import os
from datetime import timedelta
from itertools import chain

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.conf import settings
from django.utils import timezone
from django.db.models import Sum, Q, Count, Value, CharField

from apps.transformation.models import Package, InboundFileLog, SwiftRunLog, SwiftPackage


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


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def audit_trail(request):
    """
    Unified audit trail for package processing events.
    Aggregates InboundFileLog (Transformation) and SwiftRunLog (SWIFT)
    into a single sorted, filterable feed.

    Query params:
      - status: 'success' | 'failed'
      - package_type: 'transformation' | 'swift'
      - search: free-text search on filename/package name
      - date_from: ISO date string (YYYY-MM-DD)
      - date_to: ISO date string (YYYY-MM-DD)
      - page: page number (default 1)
      - page_size: items per page (default 50, max 200)
    """
    # Query params
    status_filter = request.query_params.get('status', '').lower()
    pkg_type_filter = request.query_params.get('package_type', '').lower()
    search_q = request.query_params.get('search', '').strip()
    date_from = request.query_params.get('date_from', '')
    date_to = request.query_params.get('date_to', '')

    # Pagination
    try:
        page = max(1, int(request.query_params.get('page', 1)))
    except (ValueError, TypeError):
        page = 1
    try:
        page_size = min(200, max(1, int(request.query_params.get('page_size', 50))))
    except (ValueError, TypeError):
        page_size = 50

    entries = []

    # ── Transformation Run Logs ──
    if pkg_type_filter in ('', 'transformation'):
        trfm_qs = InboundFileLog.objects.select_related('package').all()

        if status_filter:
            trfm_qs = trfm_qs.filter(status=status_filter)
        if search_q:
            trfm_qs = trfm_qs.filter(
                Q(original_filename__icontains=search_q) |
                Q(output_filename__icontains=search_q) |
                Q(package__name__icontains=search_q)
            )
        if date_from:
            trfm_qs = trfm_qs.filter(processed_at__date__gte=date_from)
        if date_to:
            trfm_qs = trfm_qs.filter(processed_at__date__lte=date_to)

        for log in trfm_qs:
            entries.append({
                'id': f'trfm-{log.id}',
                'package_type': 'Transformation',
                'package_name': log.package.name if log.package else 'Unknown',
                'original_filename': log.original_filename,
                'output_filename': log.output_filename or '',
                'status': log.status,
                'detail': f'{log.rows_processed} rows processed',
                'error_message': log.error_message,
                'run_type': log.get_run_type_display(),
                'timestamp': log.processed_at.isoformat(),
                'sort_key': log.processed_at,
            })

    # ── SWIFT Run Logs ──
    if pkg_type_filter in ('', 'swift'):
        swift_qs = SwiftRunLog.objects.select_related('swift_package').all()

        if status_filter:
            swift_qs = swift_qs.filter(status=status_filter)
        if search_q:
            swift_qs = swift_qs.filter(
                Q(original_filename__icontains=search_q) |
                Q(output_filename__icontains=search_q) |
                Q(message_type__icontains=search_q) |
                Q(swift_package__name__icontains=search_q)
            )
        if date_from:
            swift_qs = swift_qs.filter(processed_at__date__gte=date_from)
        if date_to:
            swift_qs = swift_qs.filter(processed_at__date__lte=date_to)

        for log in swift_qs:
            entries.append({
                'id': f'swift-{log.id}',
                'package_type': 'SWIFT',
                'package_name': log.swift_package.name if log.swift_package else 'Unknown',
                'original_filename': log.original_filename,
                'output_filename': log.output_filename or '',
                'status': log.status,
                'detail': f'{log.messages_processed} messages — {log.message_type}' if log.message_type else f'{log.messages_processed} messages',
                'error_message': log.error_message,
                'run_type': log.get_run_type_display(),
                'timestamp': log.processed_at.isoformat(),
                'sort_key': log.processed_at,
            })

    # Sort by timestamp descending
    entries.sort(key=lambda e: e['sort_key'], reverse=True)

    # Summary stats (computed from full set, before pagination)
    total_count = len(entries)
    success_count = sum(1 for e in entries if e['status'] == 'success')
    failed_count = sum(1 for e in entries if e['status'] == 'failed')

    # Paginate
    start = (page - 1) * page_size
    end = start + page_size
    page_entries = entries[start:end]

    # Remove sort_key from output
    for entry in page_entries:
        entry.pop('sort_key', None)

    return Response({
        'summary': {
            'total': total_count,
            'success': success_count,
            'failed': failed_count,
            'success_rate': round((success_count / total_count * 100), 1) if total_count > 0 else 0,
        },
        'pagination': {
            'page': page,
            'page_size': page_size,
            'total_pages': max(1, -(-total_count // page_size)),  # ceil division
            'total_items': total_count,
        },
        'results': page_entries,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_segregate(request):
    """
    Receive a file and a target ('transformation' or 'swift'),
    then save it to the appropriate inbound directory.
    """
    uploaded_file = request.FILES.get('file')
    target = request.data.get('target', '').lower()

    if not uploaded_file:
        return Response({'error': 'No file provided.'}, status=400)

    if target not in ('transformation', 'swift'):
        return Response({'error': 'Invalid target. Must be "transformation" or "swift".'}, status=400)

    # Determine destination directory
    if target == 'transformation':
        dest_dir = settings.TRFM_INBOUND_DIR
    else:
        dest_dir = settings.SFT_INBOUND_DIR

    # Ensure directory exists
    os.makedirs(dest_dir, exist_ok=True)

    # Save file
    dest_path = os.path.join(dest_dir, uploaded_file.name)

    # Prevent overwrites — append a suffix if file exists
    if os.path.exists(dest_path):
        base, ext = os.path.splitext(uploaded_file.name)
        counter = 1
        while os.path.exists(dest_path):
            dest_path = os.path.join(dest_dir, f'{base}_{counter}{ext}')
            counter += 1

    with open(dest_path, 'wb+') as f:
        for chunk in uploaded_file.chunks():
            f.write(chunk)

    return Response({
        'status': 'success',
        'filename': os.path.basename(dest_path),
        'target': target,
        'directory': dest_dir,
        'size': uploaded_file.size,
    })
