from django.utils import timezone
from rest_framework import generics, status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import UploadedFile, Package, FieldMapping
from .serializers import (
    UploadedFileSerializer, FileUploadSerializer,
    PackageSerializer, FieldMappingSerializer,
)
from .services import extract_headers, HeaderExtractionError


class FileUploadView(APIView):
    """
    POST: Upload one or more files (source or canvas).
    Extracts headers from each file and stores metadata.
    """
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        file_type = request.data.get('file_type')
        if file_type not in ('source', 'canvas'):
            return Response(
                {'error': 'file_type must be "source" or "canvas"'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        files = request.FILES.getlist('files')
        if not files:
            return Response(
                {'error': 'No files provided'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(files) > 10:
            return Response(
                {'error': 'Maximum 10 files per upload'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        results = []
        errors = []

        for f in files:
            try:
                # Check for duplicate filename within same type
                if UploadedFile.objects.filter(
                    file_type=file_type,
                    original_filename=f.name,
                    uploaded_by=request.user,
                ).exists():
                    errors.append({
                        'filename': f.name,
                        'error': f'Duplicate: "{f.name}" already exists in {file_type} files',
                    })
                    continue

                # Extract headers (from in-memory file — no disk write)
                header_data = extract_headers(f, f.name)

                # Save only metadata — physical file is NOT stored
                uploaded = UploadedFile.objects.create(
                    file_type=file_type,
                    original_filename=f.name,
                    file_format=header_data['file_format'],
                    headers_json=header_data['headers'],
                    field_count=header_data['field_count'],
                    uploaded_by=request.user,
                )
                results.append(UploadedFileSerializer(uploaded).data)
            except HeaderExtractionError as e:
                errors.append({'filename': f.name, 'error': str(e)})
            except Exception as e:
                errors.append({'filename': f.name, 'error': f'Unexpected error: {str(e)}'})

        response_data = {'uploaded': results}
        if errors:
            response_data['errors'] = errors

        http_status = status.HTTP_201_CREATED if results else status.HTTP_400_BAD_REQUEST
        return Response(response_data, status=http_status)


class UploadedFileListView(generics.ListAPIView):
    """
    GET: List uploaded files, filtered by file_type query param.
    Example: /api/transformation/files/?type=source
    """
    serializer_class = UploadedFileSerializer

    def get_queryset(self):
        qs = UploadedFile.objects.filter(uploaded_by=self.request.user)
        file_type = self.request.query_params.get('type')
        if file_type in ('source', 'canvas'):
            qs = qs.filter(file_type=file_type)
        return qs


class UploadedFileDeleteView(generics.DestroyAPIView):
    """DELETE: Remove an uploaded file by ID."""
    serializer_class = UploadedFileSerializer

    def get_queryset(self):
        return UploadedFile.objects.filter(uploaded_by=self.request.user)


# ─── Package CRUD ──────────────────────────────────────────────────────

class PackageCreateView(generics.CreateAPIView):
    """POST: Create a new package."""
    serializer_class = PackageSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class PackageListView(generics.ListAPIView):
    """GET: List all packages for the current user."""
    serializer_class = PackageSerializer

    def get_queryset(self):
        qs = Package.objects.filter(created_by=self.request.user)
        pkg_status = self.request.query_params.get('status')
        if pkg_status:
            qs = qs.filter(status=pkg_status)
        mapping = self.request.query_params.get('mapping_status')
        if mapping:
            qs = qs.filter(mapping_status=mapping)
        return qs


class PackageDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PUT/PATCH/DELETE: Retrieve, update, or delete a package."""
    serializer_class = PackageSerializer

    def get_queryset(self):
        return Package.objects.filter(created_by=self.request.user)


class PackageStatusView(APIView):
    """POST: Change package status (start/pause/stop)."""

    VALID_ACTIONS = {
        'start': Package.Status.ACTIVE,
        'pause': Package.Status.PAUSED,
        'stop': Package.Status.INACTIVE,
    }

    def post(self, request, pk, action):
        if action not in self.VALID_ACTIONS:
            return Response(
                {'error': f'Invalid action: {action}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            package = Package.objects.get(pk=pk, created_by=request.user)
        except Package.DoesNotExist:
            return Response(
                {'error': 'Package not found'},
                status=status.HTTP_404_NOT_FOUND,
            )

        package.status = self.VALID_ACTIONS[action]
        package.save(update_fields=['status', 'updated_at'])
        return Response(PackageSerializer(package).data)


# ─── Field Mapping ─────────────────────────────────────────────────────

class FieldMappingListView(APIView):
    """
    GET: List mappings for a package.
    POST: Bulk save/replace all mappings for a package.
    """

    def get(self, request, pk):
        try:
            package = Package.objects.get(pk=pk, created_by=request.user)
        except Package.DoesNotExist:
            return Response({'error': 'Package not found'}, status=status.HTTP_404_NOT_FOUND)

        mappings = package.field_mappings.all()
        return Response(FieldMappingSerializer(mappings, many=True).data)

    def post(self, request, pk):
        """Bulk replace all mappings: expects a list of {source_header, canvas_header, order}."""
        try:
            package = Package.objects.get(pk=pk, created_by=request.user)
        except Package.DoesNotExist:
            return Response({'error': 'Package not found'}, status=status.HTTP_404_NOT_FOUND)

        mappings_data = request.data
        if not isinstance(mappings_data, list):
            return Response(
                {'error': 'Expected a list of mappings'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate all before saving
        serializer = FieldMappingSerializer(data=mappings_data, many=True)
        serializer.is_valid(raise_exception=True)

        # Replace existing mappings
        package.field_mappings.all().delete()
        for idx, item in enumerate(serializer.validated_data):
            FieldMapping.objects.create(
                package=package,
                source_header=item.get('source_header', ''),
                canvas_header=item['canvas_header'],
                order=item.get('order', idx),
                mapping_type=item.get('mapping_type', 'direct'),
                has_condition=item.get('has_condition', False),
                condition_json=item.get('condition_json'),
                constant_value=item.get('constant_value', ''),
            )

        # Update mapping status
        package.mapping_status = Package.MappingStatus.MAPPED
        package.save(update_fields=['mapping_status', 'updated_at'])

        return Response(
            FieldMappingSerializer(package.field_mappings.all(), many=True).data,
            status=status.HTTP_201_CREATED,
        )


# ─── Ad-hoc Run ─────────────────────────────────────────────────────

class AdHocRunView(APIView):
    """POST: Manually trigger file processing for a package (emergency ad-hoc)."""

    def post(self, request, pk):
        import os
        import fnmatch
        from django.conf import settings
        from .tasks import process_inbound_file

        try:
            package = Package.objects.select_related(
                'source_file', 'canvas_file'
            ).get(pk=pk)
        except Package.DoesNotExist:
            return Response({'error': 'Package not found'}, status=status.HTTP_404_NOT_FOUND)

        if package.mapping_status != Package.MappingStatus.MAPPED:
            return Response(
                {'error': 'Package must be mapped before running'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Scan inbound for files matching this package
        inbound_dir = settings.TRFM_INBOUND_DIR
        if not os.path.exists(inbound_dir):
            return Response({'matched': 0, 'message': 'Inbound directory not found'})

        files = [f for f in os.listdir(inbound_dir) if os.path.isfile(os.path.join(inbound_dir, f))]
        dispatched = 0
        for filename in files:
            if fnmatch.fnmatch(filename.lower(), package.file_pattern.lower()):
                filepath = os.path.join(inbound_dir, filename)
                process_inbound_file.delay(package.id, filepath, filename, 'adhoc')
                dispatched += 1

        if dispatched == 0:
            return Response({
                'matched': 0,
                'message': f'No files matching pattern "{package.file_pattern}" found in inbound directory',
            })

        return Response({
            'matched': dispatched,
            'message': f'{dispatched} file(s) dispatched for ad-hoc processing',
        })


# ─── Run Logs ──────────────────────────────────────────────────────

class RunLogView(APIView):
    """GET: Recent run logs for a package."""

    def get(self, request, pk):
        from datetime import timedelta
        from .models import InboundFileLog

        try:
            package = Package.objects.get(pk=pk)
        except Package.DoesNotExist:
            return Response({'error': 'Package not found'}, status=status.HTTP_404_NOT_FOUND)

        # Only show logs from the last 7 days (data stays in DB, just filtered in view)
        cutoff = timezone.now() - timedelta(days=7)
        logs = InboundFileLog.objects.filter(
            package=package,
            processed_at__gte=cutoff,
        ).order_by('-processed_at')[:50]
        data = [
            {
                'id': log.id,
                'original_filename': log.original_filename,
                'output_filename': log.output_filename,
                'status': log.status,
                'run_type': log.run_type,
                'rows_processed': log.rows_processed,
                'file_size': log.file_size,
                'error_message': log.error_message,
                'processed_at': log.processed_at.isoformat(),
            }
            for log in logs
        ]
        return Response(data)

