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
