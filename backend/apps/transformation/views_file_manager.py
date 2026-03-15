"""
File Manager & Unprocessed Files API views.

File Manager: browse/download processed files from PostgreSQL (InboundFileLog).
Unprocessed Files: list/download/delete files in trfm_inbound directory.
"""
import os
import fnmatch
from datetime import datetime

from django.conf import settings
from django.http import HttpResponse
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import InboundFileLog, Package


# ─── File Manager (DB-backed) ──────────────────────────────────────────

class FileManagerListView(APIView):
    """
    GET /api/transformation/file-manager/
    List processed files from InboundFileLog with package name, tags, and filters.
    """

    def get(self, request):
        qs = InboundFileLog.objects.select_related('package').prefetch_related('tags').all()

        # Search filter
        search = request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(
                original_filename__icontains=search
            ) | qs.filter(
                output_filename__icontains=search
            ) | qs.filter(
                package__name__icontains=search
            )

        # Status filter
        status_filter = request.query_params.get('status')
        if status_filter in ('success', 'failed'):
            qs = qs.filter(status=status_filter)

        data = [
            {
                'id': log.id,
                'original_filename': log.original_filename,
                'output_filename': log.output_filename,
                'file_size': log.file_size,
                'file_format': log.file_format,
                'status': log.status,
                'rows_processed': log.rows_processed,
                'error_message': log.error_message,
                'package_name': log.package.name if log.package else 'Unknown',
                'package_id': log.package_id,
                'run_type': log.run_type,
                'processed_at': log.processed_at.isoformat(),
                'tags': [
                    {'id': tag.id, 'name': tag.name, 'color': tag.color}
                    for tag in log.tags.all()
                ],
            }
            for log in qs[:200]  # Cap at 200 records
        ]
        return Response(data)


class FileManagerDownloadView(APIView):
    """
    GET /api/transformation/file-manager/{id}/download/
    Download the stored binary content of a processed inbound file.
    """

    def get(self, request, pk):
        try:
            log = InboundFileLog.objects.get(pk=pk)
        except InboundFileLog.DoesNotExist:
            return Response(
                {'error': 'File not found'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not log.file_content:
            return Response(
                {'error': 'No file content stored for this record'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Determine content type
        content_types = {
            'csv': 'text/csv',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'xls': 'application/vnd.ms-excel',
        }
        content_type = content_types.get(log.file_format, 'application/octet-stream')

        response = HttpResponse(bytes(log.file_content), content_type=content_type)
        response['Content-Disposition'] = f'attachment; filename="{log.original_filename}"'
        return response


# ─── Unprocessed Files (filesystem-backed) ─────────────────────────────

class UnprocessedListView(APIView):
    """
    GET /api/transformation/unprocessed/
    List unprocessed files from trfm_inbound AND sft_inbound.
    """

    def get(self, request):
        files = []

        # ── trfm_inbound (ETL files) ─────────────────────────
        inbound_dir = settings.TRFM_INBOUND_DIR
        if os.path.exists(inbound_dir):
            # Get all active packages with their file patterns
            active_packages = Package.objects.filter(
                status__in=['active', 'inactive', 'paused'],
                mapping_status='mapped',
            ).values('id', 'name', 'file_pattern')

            for filename in sorted(os.listdir(inbound_dir)):
                filepath = os.path.join(inbound_dir, filename)
                if not os.path.isfile(filepath):
                    continue

                stat = os.stat(filepath)

                # Match against package patterns
                matched_package = None
                for pkg in active_packages:
                    if fnmatch.fnmatch(filename.lower(), pkg['file_pattern'].lower()):
                        matched_package = {
                            'id': pkg['id'],
                            'name': pkg['name'],
                        }
                        break

                # Compute dynamic tags
                file_ext = os.path.splitext(filename)[1].lower().lstrip('.')
                tags = []
                if file_ext:
                    tags.append({'name': file_ext.upper(), 'color': '#2196F3'})
                if matched_package:
                    tags.append({'name': matched_package['name'], 'color': '#FF9800'})
                    tags.append({'name': 'Ready', 'color': '#4CAF50'})
                else:
                    tags.append({'name': 'No Package', 'color': '#f44336'})

                files.append({
                    'filename': filename,
                    'size': stat.st_size,
                    'modified': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    'matched_package': matched_package,
                    'status': 'ready' if matched_package else 'no_package',
                    'source': 'etl',
                    'tags': tags,
                })

        # ── sft_inbound (SWIFT files) ─────────────────────────
        sft_dir = getattr(settings, 'SFT_INBOUND_DIR', None)
        if sft_dir and os.path.exists(sft_dir):
            for filename in sorted(os.listdir(sft_dir)):
                filepath = os.path.join(sft_dir, filename)
                if not os.path.isfile(filepath):
                    continue

                stat = os.stat(filepath)
                file_ext = os.path.splitext(filename)[1].lower().lstrip('.')

                # Auto-detect MT vs MX from extension
                is_xml = file_ext == 'xml'
                format_tag = '#MX' if is_xml else '#MT'
                format_color = '#4FC3F7' if is_xml else '#FF9800'

                tags = [
                    {'name': '#SWIFT', 'color': '#00BCD4'},
                    {'name': format_tag, 'color': format_color},
                    {'name': file_ext.upper() if file_ext else 'FILE', 'color': '#2196F3'},
                    {'name': 'Pending', 'color': '#FFC107'},
                ]

                files.append({
                    'filename': filename,
                    'size': stat.st_size,
                    'modified': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    'matched_package': None,
                    'status': 'swift_pending',
                    'source': 'swift',
                    'tags': tags,
                })

        # Also include failed SWIFT files from DB
        from .models import InboundFileLog
        failed_swift = InboundFileLog.objects.filter(
            run_type='swift', status='failed'
        ).prefetch_related('tags')[:50]
        for log in failed_swift:
            files.append({
                'filename': log.original_filename,
                'size': log.file_size,
                'modified': log.processed_at.isoformat(),
                'matched_package': None,
                'status': 'swift_failed',
                'source': 'swift_db',
                'error_message': log.error_message,
                'tags': [
                    {'name': tag.name, 'color': tag.color}
                    for tag in log.tags.all()
                ] + [{'name': 'Failed', 'color': '#f44336'}],
            })

        return Response(files)


class UnprocessedDownloadView(APIView):
    """
    GET /api/transformation/unprocessed/download/{filename}/
    Download an unprocessed file from trfm_inbound.
    """

    def get(self, request, filename):
        filepath = os.path.join(settings.TRFM_INBOUND_DIR, filename)

        # Security: prevent path traversal
        if '..' in filename or '/' in filename:
            return Response(
                {'error': 'Invalid filename'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not os.path.isfile(filepath):
            return Response(
                {'error': 'File not found'},
                status=status.HTTP_404_NOT_FOUND,
            )

        with open(filepath, 'rb') as f:
            content = f.read()

        response = HttpResponse(content, content_type='application/octet-stream')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response


class UnprocessedDeleteView(APIView):
    """
    DELETE /api/transformation/unprocessed/delete/{filename}/
    Delete an unprocessed file from trfm_inbound.
    """

    def delete(self, request, filename):
        filepath = os.path.join(settings.TRFM_INBOUND_DIR, filename)

        # Security: prevent path traversal
        if '..' in filename or '/' in filename:
            return Response(
                {'error': 'Invalid filename'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not os.path.isfile(filepath):
            return Response(
                {'error': 'File not found'},
                status=status.HTTP_404_NOT_FOUND,
            )

        os.remove(filepath)
        return Response({'status': 'ok', 'filename': filename})
