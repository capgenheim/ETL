from rest_framework import serializers
from .models import UploadedFile, Package, FieldMapping


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


class FieldMappingSerializer(serializers.ModelSerializer):
    class Meta:
        model = FieldMapping
        fields = ['id', 'source_header', 'canvas_header', 'order']


class PackageSerializer(serializers.ModelSerializer):
    source_file_name = serializers.CharField(source='source_file.original_filename', read_only=True)
    canvas_file_name = serializers.CharField(source='canvas_file.original_filename', read_only=True)
    source_headers = serializers.JSONField(source='source_file.headers_json', read_only=True)
    canvas_headers = serializers.JSONField(source='canvas_file.headers_json', read_only=True)
    field_mappings = FieldMappingSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    mapping_status_display = serializers.CharField(source='get_mapping_status_display', read_only=True)
    created_by_name = serializers.SerializerMethodField()
    created_by_email = serializers.CharField(source='created_by.email', read_only=True)
    batch_mode_display = serializers.CharField(source='get_batch_mode_display', read_only=True)

    class Meta:
        model = Package
        fields = [
            'id', 'name', 'file_pattern',
            'source_file', 'source_file_name', 'source_headers',
            'canvas_file', 'canvas_file_name', 'canvas_headers',
            'input_format', 'output_format', 'output_prefix',
            'batch_mode', 'batch_mode_display',
            'batch_interval_minutes',
            'status', 'status_display',
            'mapping_status', 'mapping_status_display',
            'field_mappings',
            'created_by_name', 'created_by_email',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'status', 'mapping_status',
            'source_file_name', 'canvas_file_name',
            'source_headers', 'canvas_headers',
            'status_display', 'mapping_status_display', 'batch_mode_display',
            'field_mappings',
            'created_by_name', 'created_by_email',
            'created_at', 'updated_at',
        ]

    def get_created_by_name(self, obj):
        user = obj.created_by
        full = f'{user.first_name} {user.last_name}'.strip()
        return full or user.username
