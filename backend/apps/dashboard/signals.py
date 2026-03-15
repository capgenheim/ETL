"""
Django signals for admin-level audit trail.
Captures model creates, updates, and deletes performed via the Django admin.
"""
import json

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.contrib.admin.models import LogEntry

from .middleware import get_current_request, get_client_ip


def _parse_geo(value):
    if not value:
        return None
    try:
        from decimal import Decimal, InvalidOperation
        d = Decimal(value)
        if -180 <= d <= 180:
            return d
    except (InvalidOperation, ValueError, TypeError):
        pass
    return None


@receiver(post_save, sender=LogEntry)
def audit_admin_action(sender, instance, created, **kwargs):
    """
    Fires whenever Django's admin LogEntry is saved.
    This captures ALL admin actions: add, change, delete.
    """
    if not created:
        return

    from .models import AuditLog

    # Map Django admin action flags to our action names
    ACTION_FLAG_MAP = {
        1: 'ADMIN_ADD',       # ADDITION
        2: 'ADMIN_CHANGE',    # CHANGE
        3: 'ADMIN_DELETE',    # DELETION
    }

    action = ACTION_FLAG_MAP.get(instance.action_flag, 'ADMIN_ACTION')
    content_type = instance.content_type
    resource_type = content_type.model_class().__name__ if content_type else 'Unknown'

    # Build detail from LogEntry's change_message
    change_message = instance.get_change_message() or ''
    detail = f"Admin {action.split('_')[1].lower()}: {resource_type} — {instance.object_repr}"
    if change_message:
        detail += f" ({change_message})"

    # Parse changes from change_message JSON if available
    changes_json = None
    try:
        msg_raw = instance.change_message
        if msg_raw and msg_raw.startswith('['):
            changes_json = json.loads(msg_raw)
    except (json.JSONDecodeError, TypeError):
        pass

    # Get request from thread-local
    request = get_current_request()
    ip = get_client_ip(request) if request else ''
    user_agent = request.META.get('HTTP_USER_AGENT', '')[:500] if request else ''
    geo_lat = _parse_geo(request.META.get('HTTP_X_GEO_LAT')) if request else None
    geo_lng = _parse_geo(request.META.get('HTTP_X_GEO_LNG')) if request else None

    try:
        AuditLog.objects.create(
            user=instance.user,
            user_email=instance.user.email if instance.user else '',
            action=action,
            category='ADMIN',
            resource_type=resource_type,
            resource_id=str(instance.object_id or ''),
            detail=detail,
            changes_json=changes_json,
            ip_address=ip or None,
            user_agent=user_agent,
            geo_lat=geo_lat,
            geo_lng=geo_lng,
            request_method='ADMIN',
            request_path=f"/admin/{content_type.app_label}/{content_type.model}/{instance.object_id}/" if content_type else '',
            status='SUCCESS',
        )
    except Exception:
        pass  # Never break admin due to audit failure
