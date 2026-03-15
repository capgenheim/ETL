from django.contrib import admin
from unfold.admin import ModelAdmin
from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(ModelAdmin):
    """
    Read-only admin view for AuditLog — immutable financial audit trail.
    No add/edit/delete — records are append-only.
    """

    list_display = [
        'timestamp', 'action', 'category', 'user_email',
        'resource_type', 'resource_id', 'status',
        'ip_address', 'geo_display',
    ]
    list_filter = ['category', 'action', 'status', 'timestamp']
    search_fields = ['user_email', 'detail', 'resource_type', 'resource_id', 'ip_address', 'action']
    readonly_fields = [
        'user', 'user_email', 'action', 'category',
        'resource_type', 'resource_id', 'detail', 'changes_json',
        'ip_address', 'user_agent',
        'geo_lat', 'geo_lng',
        'request_method', 'request_path', 'session_id',
        'status', 'timestamp',
    ]
    list_per_page = 50
    date_hierarchy = 'timestamp'
    ordering = ['-timestamp']

    # Fieldset grouping for detail view
    fieldsets = (
        ('Action', {
            'fields': ('action', 'category', 'status', 'detail'),
        }),
        ('User', {
            'fields': ('user', 'user_email'),
        }),
        ('Resource', {
            'fields': ('resource_type', 'resource_id', 'changes_json'),
        }),
        ('Network & Location', {
            'fields': ('ip_address', 'user_agent', 'geo_lat', 'geo_lng'),
        }),
        ('Request', {
            'fields': ('request_method', 'request_path', 'session_id'),
        }),
        ('Timing', {
            'fields': ('timestamp',),
        }),
    )

    def geo_display(self, obj):
        """Show lat/lng as a compact string."""
        if obj.geo_lat and obj.geo_lng:
            return f"{obj.geo_lat:.4f}, {obj.geo_lng:.4f}"
        return '—'
    geo_display.short_description = 'Geolocation'

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
