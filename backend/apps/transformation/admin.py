from django.contrib import admin
from unfold.admin import ModelAdmin
from .models import UploadedFile


@admin.register(UploadedFile)
class UploadedFileAdmin(ModelAdmin):
    list_display = ('original_filename', 'file_type', 'file_format', 'field_count', 'uploaded_by', 'created_at')
    list_filter = ('file_type', 'file_format', 'created_at')
    search_fields = ('original_filename',)
    readonly_fields = ('headers_json', 'field_count', 'file_format', 'created_at', 'updated_at')
