from rest_framework import serializers
from .models import UploadedFile, Package, FieldMapping, InboundFileLog, DirectoryRegistry


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
        fields = [
            'id', 'source_header', 'canvas_header', 'order',
            'mapping_type', 'has_condition', 'condition_json', 'constant_value',
        ]


class PackageSerializer(serializers.ModelSerializer):
    source_file_name = serializers.CharField(source='source_file.original_filename', read_only=True, default='')
    canvas_file_name = serializers.CharField(source='canvas_file.original_filename', read_only=True, default='')
    source_headers = serializers.JSONField(source='source_file.headers_json', read_only=True, default=list)
    canvas_headers = serializers.JSONField(source='canvas_file.headers_json', read_only=True, default=list)
    field_mappings = FieldMappingSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    mapping_status_display = serializers.CharField(source='get_mapping_status_display', read_only=True)
    package_type_display = serializers.CharField(source='get_package_type_display', read_only=True)
    filename_mode_display = serializers.CharField(source='get_filename_mode_display', read_only=True)
    pool_directory_name = serializers.CharField(source='pool_directory.name', read_only=True, default='')
    delivery_directory_name = serializers.CharField(source='delivery_directory.name', read_only=True, default='')
    created_by_name = serializers.SerializerMethodField()
    created_by_email = serializers.CharField(source='created_by.email', read_only=True)
    batch_mode_display = serializers.CharField(source='get_batch_mode_display', read_only=True)
    run_log_summary = serializers.SerializerMethodField()

    class Meta:
        model = Package
        fields = [
            'id', 'name', 'package_type', 'package_type_display',
            'filename_mode', 'filename_mode_display',
            'file_pattern',
            'source_file', 'source_file_name', 'source_headers',
            'canvas_file', 'canvas_file_name', 'canvas_headers',
            'pool_directory', 'pool_directory_name',
            'delivery_directory', 'delivery_directory_name',
            'input_format', 'output_format', 'output_prefix',
            'batch_mode', 'batch_mode_display',
            'batch_interval_minutes',
            'status', 'status_display',
            'mapping_status', 'mapping_status_display',
            'field_mappings',
            'created_by_name', 'created_by_email',
            'run_log_summary',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'status', 'mapping_status',
            'source_file_name', 'canvas_file_name',
            'source_headers', 'canvas_headers',
            'status_display', 'mapping_status_display', 'batch_mode_display',
            'package_type_display', 'filename_mode_display',
            'pool_directory_name', 'delivery_directory_name',
            'field_mappings',
            'created_by_name', 'created_by_email',
            'run_log_summary',
            'created_at', 'updated_at',
        ]

    def get_created_by_name(self, obj):
        user = obj.created_by
        full = f'{user.first_name} {user.last_name}'.strip()
        return full or user.username

    def get_run_log_summary(self, obj):
        logs = InboundFileLog.objects.filter(package=obj)
        total = logs.count()
        success = logs.filter(status='success').count()
        failed = logs.filter(status='failed').count()
        last_run = logs.first()  # Already ordered by -processed_at
        return {
            'total': total,
            'success': success,
            'failed': failed,
            'last_run': last_run.processed_at.isoformat() if last_run else None,
            'last_status': last_run.status if last_run else None,
            'last_run_type': last_run.run_type if last_run else None,
        }

    def validate(self, data):
        """Cross-field validation based on package_type."""
        pkg_type = data.get('package_type', self.instance.package_type if self.instance else 'transformation')

        # Transformation requires source and canvas files
        if pkg_type == 'transformation':
            if not data.get('source_file') and not (self.instance and self.instance.source_file_id):
                raise serializers.ValidationError({'source_file': 'Source file is required for transformation packages.'})
            if not data.get('canvas_file') and not (self.instance and self.instance.canvas_file_id):
                raise serializers.ValidationError({'canvas_file': 'Canvas file is required for transformation packages.'})

        # Convert: block same-to-same and anything→xls
        if pkg_type == 'convert':
            inp = data.get('input_format', self.instance.input_format if self.instance else 'csv')
            out = data.get('output_format', self.instance.output_format if self.instance else 'csv')
            if inp == out:
                raise serializers.ValidationError({'output_format': f'Cannot convert {inp.upper()} to {out.upper()} (same format).'})
            if out == 'xls':
                raise serializers.ValidationError({'output_format': 'XLS output is not supported. Use XLSX or CSV.'})

        # Prefix mode requires output_prefix
        filename_mode = data.get('filename_mode', self.instance.filename_mode if self.instance else 'prefix')
        if filename_mode == 'prefix':
            prefix = data.get('output_prefix', self.instance.output_prefix if self.instance else '')
            if pkg_type != 'passthrough' and not prefix:
                # Allow passthrough without prefix since it can use original filename
                pass

        return data


class DirectoryRegistrySerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = DirectoryRegistry
        fields = ['id', 'name', 'dir_type', 'is_default', 'created_by_name', 'created_at']
        read_only_fields = ['id', 'is_default', 'created_by_name', 'created_at']

    def get_created_by_name(self, obj):
        if not obj.created_by:
            return 'System'
        full = f'{obj.created_by.first_name} {obj.created_by.last_name}'.strip()
        return full or obj.created_by.username

    def validate_name(self, value):
        import re
        value = value.strip().lower()
        if not re.match(r'^[a-z0-9_-]+$', value):
            raise serializers.ValidationError('Name must contain only lowercase letters, numbers, underscores, and hyphens.')
        return value

