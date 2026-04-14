from django.contrib import admin
from unfold.admin import ModelAdmin, TabularInline
from .models import (
    UploadedFile, Package, FieldMapping, InboundFileLog,
    FileTag, DirectoryRegistry, SwiftDirectoryRegistry,
)


@admin.register(SwiftDirectoryRegistry)
class SwiftDirectoryRegistryAdmin(ModelAdmin):
    list_display = ('name', 'is_default', 'created_by', 'created_at')
    list_filter = ('is_default',)
    search_fields = ('name',)
    readonly_fields = ('created_at',)


@admin.register(DirectoryRegistry)
class DirectoryRegistryAdmin(ModelAdmin):
    list_display = ('name', 'dir_type', 'is_default', 'created_by', 'created_at')
    list_filter = ('dir_type', 'is_default')
    search_fields = ('name',)
    readonly_fields = ('created_at',)


@admin.register(FileTag)
class FileTagAdmin(ModelAdmin):
    list_display = ('name', 'color', 'auto_created', 'created_at')
    search_fields = ('name',)


@admin.register(UploadedFile)
class UploadedFileAdmin(ModelAdmin):
    list_display = ('original_filename', 'file_type', 'file_format', 'field_count', 'uploaded_by', 'created_at')
    list_filter = ('file_type', 'file_format', 'created_at')
    search_fields = ('original_filename',)
    readonly_fields = ('headers_json', 'field_count', 'file_format', 'created_at', 'updated_at')


class FieldMappingInline(TabularInline):
    model = FieldMapping
    extra = 0
    fields = ('order', 'source_header', 'canvas_header', 'mapping_type', 'has_condition')


@admin.register(Package)
class PackageAdmin(ModelAdmin):
    list_display = (
        'name', 'package_type', 'file_pattern', 'status', 'mapping_status',
        'pool_directory', 'delivery_directory', 'batch_mode', 'created_by',
    )
    list_filter = ('package_type', 'status', 'mapping_status', 'batch_mode', 'input_format', 'output_format')
    search_fields = ('name', 'file_pattern')
    readonly_fields = ('created_at', 'updated_at')
    inlines = [FieldMappingInline]


@admin.register(InboundFileLog)
class InboundFileLogAdmin(ModelAdmin):
    list_display = ('original_filename', 'package', 'output_filename', 'status', 'run_type', 'rows_processed', 'file_size', 'processed_at')
    list_filter = ('status', 'run_type', 'processed_at')
    search_fields = ('original_filename', 'output_filename')
    readonly_fields = ('file_content', 'processed_at')


