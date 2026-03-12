from django.contrib import admin
from unfold.admin import ModelAdmin, TabularInline
from .models import UploadedFile, Package, FieldMapping


@admin.register(UploadedFile)
class UploadedFileAdmin(ModelAdmin):
    list_display = ('original_filename', 'file_type', 'file_format', 'field_count', 'uploaded_by', 'created_at')
    list_filter = ('file_type', 'file_format', 'created_at')
    search_fields = ('original_filename',)
    readonly_fields = ('headers_json', 'field_count', 'file_format', 'created_at', 'updated_at')


class FieldMappingInline(TabularInline):
    model = FieldMapping
    extra = 0
    fields = ('order', 'source_header', 'canvas_header')


@admin.register(Package)
class PackageAdmin(ModelAdmin):
    list_display = ('name', 'file_pattern', 'status', 'mapping_status', 'batch_mode', 'created_by', 'created_at')
    list_filter = ('status', 'mapping_status', 'batch_mode', 'input_format', 'output_format')
    search_fields = ('name', 'file_pattern')
    readonly_fields = ('created_at', 'updated_at')
    inlines = [FieldMappingInline]
