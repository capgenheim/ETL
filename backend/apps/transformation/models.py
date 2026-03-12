import os
from django.conf import settings
from django.db import models


def upload_path(instance, filename):
    """Store files under media/uploads/<file_type>/<filename>"""
    return os.path.join('uploads', instance.file_type, filename)


class UploadedFile(models.Model):
    """Stores uploaded source/canvas files with extracted header metadata."""

    FILE_TYPE_CHOICES = [
        ('source', 'Source File'),
        ('canvas', 'Canvas File'),
    ]

    FORMAT_CHOICES = [
        ('xlsx', 'Excel (xlsx)'),
        ('xls', 'Excel 97-2003 (xls)'),
        ('csv', 'CSV'),
    ]

    file_type = models.CharField(max_length=10, choices=FILE_TYPE_CHOICES, db_index=True)
    file = models.FileField(upload_to=upload_path, blank=True, null=True)
    original_filename = models.CharField(max_length=255)
    file_format = models.CharField(max_length=10, choices=FORMAT_CHOICES)
    headers_json = models.JSONField(default=list, help_text='Extracted column headers')
    field_count = models.PositiveIntegerField(default=0)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='uploaded_files',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Uploaded File'
        verbose_name_plural = 'Uploaded Files'

    def __str__(self):
        return f'{self.original_filename} ({self.file_type})'


class Package(models.Model):
    """ETL transformation package — defines how source files are mapped to canvas output."""

    class Status(models.TextChoices):
        INACTIVE = 'inactive', 'Inactive'
        ACTIVE = 'active', 'Active'
        RUNNING = 'running', 'Running'
        PAUSED = 'paused', 'Paused'

    class MappingStatus(models.TextChoices):
        UNMAPPED = 'unmapped', 'Unmapped'
        MAPPED = 'mapped', 'Mapped'

    class BatchMode(models.TextChoices):
        INSTANT = 'instant', 'Instant (File Sense)'
        SCHEDULED = 'scheduled', 'Scheduled'

    FORMAT_CHOICES = [
        ('xlsx', 'Excel (xlsx)'),
        ('xls', 'Excel 97-2003 (xls)'),
        ('csv', 'CSV'),
    ]

    name = models.CharField(max_length=255, help_text='Package display name')
    file_pattern = models.CharField(
        max_length=255,
        help_text='Glob pattern for matching inbound files, e.g. MBB_*.csv',
    )
    source_file = models.ForeignKey(
        UploadedFile,
        on_delete=models.PROTECT,
        related_name='packages_as_source',
        limit_choices_to={'file_type': 'source'},
        help_text='Source file whose headers define the input schema',
    )
    canvas_file = models.ForeignKey(
        UploadedFile,
        on_delete=models.PROTECT,
        related_name='packages_as_canvas',
        limit_choices_to={'file_type': 'canvas'},
        help_text='Canvas file whose headers define the output schema',
    )
    input_format = models.CharField(
        max_length=10, choices=FORMAT_CHOICES, default='csv',
        help_text='Expected format of inbound source files',
    )
    output_format = models.CharField(
        max_length=10, choices=FORMAT_CHOICES, default='csv',
        help_text='Format of the transformed output file',
    )
    output_prefix = models.CharField(
        max_length=255,
        help_text='Prefix for output filename, e.g. mbbprocess_',
    )
    batch_mode = models.CharField(
        max_length=10, choices=BatchMode.choices, default=BatchMode.INSTANT,
    )
    batch_interval_minutes = models.PositiveIntegerField(
        default=0,
        help_text='Interval in minutes (1–1440) when batch_mode is scheduled',
    )
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.INACTIVE, db_index=True,
    )
    mapping_status = models.CharField(
        max_length=10, choices=MappingStatus.choices, default=MappingStatus.UNMAPPED,
        db_index=True,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='packages',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Package'
        verbose_name_plural = 'Packages'

    def __str__(self):
        return f'{self.name} ({self.get_status_display()})'


class FieldMapping(models.Model):
    """Maps a source column header to a canvas column header within a package."""

    package = models.ForeignKey(
        Package,
        on_delete=models.CASCADE,
        related_name='field_mappings',
    )
    source_header = models.CharField(max_length=255, help_text='Column from source file')
    canvas_header = models.CharField(max_length=255, help_text='Column from canvas file')
    order = models.PositiveIntegerField(default=0, help_text='Display/export order')

    class Meta:
        ordering = ['order']
        unique_together = [('package', 'canvas_header')]
        verbose_name = 'Field Mapping'
        verbose_name_plural = 'Field Mappings'

    def __str__(self):
        return f'{self.source_header} → {self.canvas_header}'
