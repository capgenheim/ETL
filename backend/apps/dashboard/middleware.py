"""
Audit middleware — captures all state-changing API requests and admin operations.
Logs to AuditLog with IP, user agent, geolocation, and request details.
"""
import threading
import re

from django.utils.deprecation import MiddlewareMixin

# Thread-local storage for passing request context to signals
_thread_locals = threading.local()


def get_current_request():
    """Get the current request from thread-local storage."""
    return getattr(_thread_locals, 'request', None)


def get_client_ip(request):
    """Extract real client IP from proxy headers."""
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    if xff:
        return xff.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '')


# Map API paths to action names and categories
ACTION_MAP = [
    # Auth
    (r'^/api/auth/login/$', 'POST', 'LOGIN', 'AUTH'),
    (r'^/api/auth/logout/$', 'POST', 'LOGOUT', 'AUTH'),
    (r'^/api/auth/refresh/$', 'POST', 'TOKEN_REFRESH', 'AUTH'),
    (r'^/api/auth/me/update/$', 'PUT|PATCH', 'UPDATE_PROFILE', 'AUTH'),
    # Files
    (r'^/api/transformation/upload/$', 'POST', 'UPLOAD_FILE', 'TRANSFORMATION'),
    (r'^/api/transformation/files/\d+/$', 'DELETE', 'DELETE_FILE', 'TRANSFORMATION'),
    (r'^/api/transformation/files/\d+/mandatory/$', 'PATCH', 'UPDATE_MANDATORY_FIELDS', 'TRANSFORMATION'),
    # Packages
    (r'^/api/transformation/packages/create/$', 'POST', 'CREATE_PACKAGE', 'TRANSFORMATION'),
    (r'^/api/transformation/packages/\d+/$', 'PUT|PATCH', 'UPDATE_PACKAGE', 'TRANSFORMATION'),
    (r'^/api/transformation/packages/\d+/$', 'DELETE', 'DELETE_PACKAGE', 'TRANSFORMATION'),
    (r'^/api/transformation/packages/\d+/activate/$', 'POST', 'ACTIVATE_PACKAGE', 'TRANSFORMATION'),
    (r'^/api/transformation/packages/\d+/pause/$', 'POST', 'PAUSE_PACKAGE', 'TRANSFORMATION'),
    (r'^/api/transformation/packages/\d+/stop/$', 'POST', 'STOP_PACKAGE', 'TRANSFORMATION'),
    (r'^/api/transformation/packages/\d+/mappings/$', 'POST', 'SAVE_MAPPINGS', 'TRANSFORMATION'),
    (r'^/api/transformation/packages/\d+/adhoc-run/$', 'POST', 'ADHOC_RUN', 'TRANSFORMATION'),
    # Unprocessed files
    (r'^/api/transformation/unprocessed/delete/', 'DELETE', 'DELETE_UNPROCESSED_FILE', 'FILE_MANAGER'),
]


class AuditMiddleware(MiddlewareMixin):
    """
    Intercepts requests to log significant operations to AuditLog.
    Stores request in thread-local for Django admin signal handlers.
    """

    def process_request(self, request):
        """Store request in thread-local and cache body for audit."""
        _thread_locals.request = request
        # Cache body early before DRF consumes the stream
        if request.method in ('POST', 'PUT', 'PATCH') and request.content_type == 'application/json':
            try:
                request._audit_body = request.body
            except Exception:
                request._audit_body = b''

    def process_response(self, request, response):
        """Log state-changing API requests after response is generated."""
        # Only log state-changing methods
        if request.method not in ('POST', 'PUT', 'PATCH', 'DELETE'):
            return response

        path = request.path
        method = request.method

        # Match against action map
        action = None
        category = 'SYSTEM'
        for pattern, methods, act_name, cat in ACTION_MAP:
            if re.match(pattern, path) and method in methods.split('|'):
                action = act_name
                category = cat
                break

        if not action:
            # Skip unmatched paths (GET requests, static files, etc.)
            return response

        # Determine success/failure
        status_code = response.status_code
        status = 'SUCCESS' if 200 <= status_code < 400 else 'FAILED'

        # Extract resource ID from URL if present
        resource_id = ''
        id_match = re.search(r'/(\d+)/', path)
        if id_match:
            resource_id = id_match.group(1)

        # Extract user
        user = request.user if hasattr(request, 'user') and request.user.is_authenticated else None
        user_email = getattr(user, 'email', '') if user else ''

        # For login, get email from cached body and optionally from response
        if action == 'LOGIN':
            try:
                import json
                body_bytes = getattr(request, '_audit_body', b'')
                body = json.loads(body_bytes.decode('utf-8', errors='ignore'))
                user_email = body.get('email', '')
            except Exception:
                pass
            # On success, also get the authenticated user from response
            if status == 'SUCCESS' and not user:
                try:
                    import json
                    resp_data = json.loads(response.content.decode('utf-8', errors='ignore'))
                    user_email = resp_data.get('user', {}).get('email', user_email)
                    # Try to link actual user object
                    from apps.accounts.models import User as UserModel
                    user = UserModel.objects.filter(email=user_email).first()
                except Exception:
                    pass

        # Build detail
        detail = f"{method} {path} → {status_code}"
        if action == 'LOGIN' and status == 'FAILED':
            detail = f"Failed login attempt for {user_email}"

        try:
            from .models import AuditLog
            AuditLog.objects.create(
                user=user,
                user_email=user_email,
                action=action,
                category=category,
                resource_id=resource_id,
                detail=detail,
                ip_address=get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
                geo_lat=_parse_geo(request.META.get('HTTP_X_GEO_LAT')),
                geo_lng=_parse_geo(request.META.get('HTTP_X_GEO_LNG')),
                request_method=method,
                request_path=path[:500],
                status=status,
            )
        except Exception:
            pass  # Never break the request due to audit logging failure

        return response

    def process_exception(self, request, exception):
        """Log unhandled exceptions."""
        if request.method in ('POST', 'PUT', 'PATCH', 'DELETE'):
            try:
                from .models import AuditLog
                user = request.user if hasattr(request, 'user') and request.user.is_authenticated else None
                AuditLog.objects.create(
                    user=user,
                    user_email=getattr(user, 'email', '') if user else '',
                    action='UNHANDLED_EXCEPTION',
                    category='SYSTEM',
                    detail=f"{request.method} {request.path} → {type(exception).__name__}: {str(exception)[:500]}",
                    ip_address=get_client_ip(request),
                    user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
                    geo_lat=_parse_geo(request.META.get('HTTP_X_GEO_LAT')),
                    geo_lng=_parse_geo(request.META.get('HTTP_X_GEO_LNG')),
                    request_method=request.method,
                    request_path=request.path[:500],
                    status='FAILED',
                )
            except Exception:
                pass
        return None


def _parse_geo(value):
    """Safely parse a geolocation header value to Decimal."""
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
