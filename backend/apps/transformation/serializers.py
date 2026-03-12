from rest_framework import serializers
from .models import UploadedFile


class UploadedFileSerializer(serializers.ModelSerializer):
    """Serializer for listing uploaded files with header metadata."""

    class Meta:
        model = UploadedFile
        fields = [
            'id',
            'file_type',
            'original_filename',
            'file_format',
            'headers_json',
            'field_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields


class FileUploadSerializer(serializers.Serializer):
    """Serializer for file upload request validation."""

    files = serializers.ListField(
        child=serializers.FileField(),
        min_length=1,
        max_length=10,
        help_text='Upload up to 10 files at once',
    )
    file_type = serializers.ChoiceField(
        choices=['source', 'canvas'],
        help_text='Type of file being uploaded',
    )
