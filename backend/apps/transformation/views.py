from rest_framework import generics, status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import UploadedFile
from .serializers import UploadedFileSerializer, FileUploadSerializer
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
