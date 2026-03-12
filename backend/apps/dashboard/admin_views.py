"""
Custom admin views for the Dashboard module — API Documentation.
"""
import json
from django.views import View
from django.http import HttpResponse, JsonResponse
from django.template.response import TemplateResponse
from django.contrib.admin.views.decorators import staff_member_required
from django.utils.decorators import method_decorator


API_DOCUMENTATION = [
    {
        "group": "Authentication",
        "endpoints": [
            {
                "method": "POST",
                "path": "/api/auth/login/",
                "description": "Authenticate user and return OAuth2 access/refresh tokens.",
                "request_body": {
                    "email": "string (required) — User email address",
                    "password": "string (required) — User password",
                },
                "response_200": {
                    "access_token": "string — OAuth2 bearer token",
                    "refresh_token": "string — Token for refreshing access",
                    "token_type": "bearer",
                    "expires_in": "integer — Seconds until access token expires",
                    "user": {
                        "id": "integer",
                        "email": "string",
                        "username": "string",
                        "role": "string",
                        "first_name": "string",
                        "last_name": "string",
                    },
                },
                "errors": {
                    "401": "Invalid credentials",
                    "423": "Account locked (too many failed attempts)",
                },
                "auth_required": False,
            },
            {
                "method": "POST",
                "path": "/api/auth/logout/",
                "description": "Revoke current OAuth2 access and refresh tokens.",
                "request_body": {
                    "refresh_token": "string (optional) — Refresh token to revoke",
                },
                "response_200": {"status": "ok"},
                "auth_required": True,
            },
            {
                "method": "POST",
                "path": "/api/auth/token/refresh/",
                "description": "Refresh an expired access token using a valid refresh token.",
                "request_body": {
                    "refresh_token": "string (required) — Valid refresh token",
                },
                "response_200": {
                    "access_token": "string — New access token",
                    "expires_in": "integer — Seconds until expiry",
                },
                "auth_required": False,
            },
            {
                "method": "GET",
                "path": "/api/auth/me/",
                "description": "Get current authenticated user profile.",
                "response_200": {
                    "id": "integer",
                    "email": "string",
                    "username": "string",
                    "role": "string",
                    "first_name": "string",
                    "last_name": "string",
                    "is_active": "boolean",
                    "last_login": "datetime (ISO 8601)",
                },
                "auth_required": True,
            },
        ],
    },
    {
        "group": "File Upload",
        "endpoints": [
            {
                "method": "POST",
                "path": "/api/transformation/upload/",
                "description": "Upload a source or canvas file (CSV, XLS, XLSX). Headers are auto-extracted. Canvas files with * prefix headers are auto-marked mandatory.",
                "request_body": {
                    "file": "file (required) — The file to upload (multipart/form-data)",
                    "file_type": "string (required) — 'source' or 'canvas'",
                },
                "response_201": {
                    "id": "integer — File ID",
                    "file_type": "string",
                    "original_filename": "string",
                    "file_format": "string — csv/xls/xlsx",
                    "headers": "array of strings — Extracted column headers",
                    "mandatory_fields": "array of strings — Auto-detected mandatory fields (canvas only)",
                    "field_count": "integer",
                },
                "errors": {
                    "400": "Invalid file format or missing fields",
                },
                "auth_required": True,
            },
            {
                "method": "GET",
                "path": "/api/transformation/files/?type={source|canvas}",
                "description": "List uploaded files filtered by type (source or canvas).",
                "query_params": {
                    "type": "string — 'source' or 'canvas'",
                },
                "response_200": [
                    {
                        "id": "integer",
                        "file_type": "string",
                        "original_filename": "string",
                        "file_format": "string",
                        "headers": "array of strings",
                        "mandatory_fields": "array of strings",
                        "field_count": "integer",
                        "created_at": "datetime (ISO 8601)",
                    }
                ],
                "auth_required": True,
            },
            {
                "method": "DELETE",
                "path": "/api/transformation/files/{id}/",
                "description": "Delete an uploaded file. Fails if file is used by a package.",
                "response_204": "No content",
                "errors": {
                    "400": "File is referenced by a package",
                    "404": "File not found",
                },
                "auth_required": True,
            },
            {
                "method": "PATCH",
                "path": "/api/transformation/files/{id}/mandatory/",
                "description": "Update the mandatory fields list for a canvas file.",
                "request_body": {
                    "mandatory_fields": "array of strings — Field names to mark as mandatory (must exist in file headers)",
                },
                "response_200": {
                    "mandatory_fields": "array of strings — Updated mandatory fields",
                },
                "errors": {
                    "400": "Invalid field names (not in file headers)",
                    "404": "File not found",
                },
                "auth_required": True,
            },
        ],
    },
    {
        "group": "Packages",
        "endpoints": [
            {
                "method": "GET",
                "path": "/api/transformation/packages/",
                "description": "List all transformation packages for the current user.",
                "response_200": [
                    {
                        "id": "integer",
                        "name": "string",
                        "file_pattern": "string — Glob pattern e.g. MBB*.csv",
                        "source_file": "object — Source file details",
                        "canvas_file": "object — Canvas file details",
                        "canvas_mandatory_fields": "array — Mandatory canvas fields",
                        "input_format": "string — csv/xls/xlsx",
                        "output_format": "string — csv/xlsx",
                        "output_prefix": "string",
                        "batch_mode": "string — instant/interval",
                        "status": "string — draft/active/paused/stopped",
                        "mapping_status": "string — unmapped/mapped/partial",
                        "created_at": "datetime (ISO 8601)",
                    }
                ],
                "auth_required": True,
            },
            {
                "method": "POST",
                "path": "/api/transformation/packages/",
                "description": "Create a new transformation package.",
                "request_body": {
                    "name": "string (required) — Package name",
                    "source_file": "integer (required) — Source file ID",
                    "canvas_file": "integer (required) — Canvas file ID",
                    "file_pattern": "string (required) — File matching pattern e.g. MBB*.csv",
                    "input_format": "string — csv/xls/xlsx (default: csv)",
                    "output_format": "string — csv/xlsx (default: csv)",
                    "output_prefix": "string — Prefix for output filenames",
                    "batch_mode": "string — instant/interval (default: instant)",
                    "batch_interval_minutes": "integer — Interval in minutes (if batch_mode=interval)",
                },
                "response_201": {"id": "integer", "name": "string", "...": "full package object"},
                "auth_required": True,
            },
            {
                "method": "GET",
                "path": "/api/transformation/packages/{id}/",
                "description": "Get details of a specific package.",
                "response_200": "Full package object with source/canvas file details and mandatory fields.",
                "auth_required": True,
            },
            {
                "method": "PUT",
                "path": "/api/transformation/packages/{id}/",
                "description": "Update a package (name, status, files, pattern, etc.).",
                "request_body": "Same fields as POST (all optional for partial update).",
                "response_200": "Updated package object.",
                "auth_required": True,
            },
            {
                "method": "DELETE",
                "path": "/api/transformation/packages/{id}/",
                "description": "Delete a package and all associated mappings.",
                "response_204": "No content",
                "auth_required": True,
            },
        ],
    },
    {
        "group": "Field Mappings",
        "endpoints": [
            {
                "method": "GET",
                "path": "/api/transformation/packages/{id}/mappings/",
                "description": "Get all field mappings for a package.",
                "response_200": [
                    {
                        "id": "integer",
                        "source_header": "string — Source file column (or empty for constant)",
                        "canvas_header": "string — Canvas file column",
                        "order": "integer — Display order",
                        "mapping_type": "string — direct/condition/constant",
                        "has_condition": "boolean",
                        "condition_json": "object — Condition rule details (if has_condition)",
                        "constant_value": "string — Fixed value (if mapping_type=constant)",
                    }
                ],
                "auth_required": True,
            },
            {
                "method": "POST",
                "path": "/api/transformation/packages/{id}/mappings/",
                "description": "Save all field mappings for a package. Validates that all mandatory canvas fields are mapped before saving.",
                "request_body": {
                    "mappings": [
                        {
                            "source_header": "string",
                            "canvas_header": "string (required)",
                            "mapping_type": "string — direct/condition/constant",
                            "constant_value": "string — Value for constant mappings",
                            "condition_json": {
                                "condition_type": "string — if_else/if_only/constant",
                                "source_field": "string — Field to evaluate",
                                "operator": "string — ==, !=, contains, etc.",
                                "compare_value": "string — Value to compare against",
                                "then_mode": "string — field/value",
                                "then_source": "string — Source field for THEN (if mode=field)",
                                "then_value": "string — Literal value for THEN (if mode=value or constant)",
                                "else_mode": "string — field/value (if_else only)",
                                "else_source": "string",
                                "else_value": "string",
                            },
                        }
                    ]
                },
                "response_200": {"status": "ok", "count": "integer — Number of mappings saved"},
                "errors": {
                    "400": "Unmapped mandatory fields — returns list of missing fields",
                },
                "auth_required": True,
            },
        ],
    },
    {
        "group": "Run Logs & Ad-hoc",
        "endpoints": [
            {
                "method": "GET",
                "path": "/api/transformation/packages/{id}/run-logs/",
                "description": "Get inbound file processing logs for a package (last 7 days).",
                "response_200": [
                    {
                        "id": "integer",
                        "original_filename": "string",
                        "output_filename": "string",
                        "file_size": "integer — Bytes",
                        "rows_processed": "integer",
                        "status": "string — success/failed",
                        "error_message": "string (nullable)",
                        "run_type": "string — instant/scheduled/adhoc",
                        "processed_at": "datetime (ISO 8601)",
                    }
                ],
                "permissions": "can_view_run_logs",
                "auth_required": True,
            },
            {
                "method": "POST",
                "path": "/api/transformation/packages/{id}/adhoc-run/",
                "description": "Manually trigger file processing for a package. Scans trfm_inbound for matching files and processes them immediately.",
                "response_200": {
                    "status": "ok",
                    "files_processed": "integer",
                    "results": "array of {filename, status, rows_processed, error_message}",
                },
                "errors": {
                    "404": "Package not found or inactive",
                },
                "permissions": "can_run_adhoc",
                "auth_required": True,
            },
        ],
    },
    {
        "group": "File Manager (Processed Files)",
        "endpoints": [
            {
                "method": "GET",
                "path": "/api/transformation/file-manager/",
                "description": "List processed output files stored in the database (from InboundFileLog).",
                "query_params": {
                    "search": "string — Filter by filename",
                    "status": "string — Filter by status (success/failed)",
                },
                "response_200": [
                    {
                        "id": "integer",
                        "original_filename": "string",
                        "output_filename": "string",
                        "file_size": "integer",
                        "file_format": "string",
                        "status": "string",
                        "rows_processed": "integer",
                        "package_name": "string",
                        "processed_at": "datetime (ISO 8601)",
                        "tags": "array of {id, name, color}",
                    }
                ],
                "permissions": "can_view_file_manager",
                "auth_required": True,
            },
            {
                "method": "GET",
                "path": "/api/transformation/file-manager/{id}/download/",
                "description": "Download a processed file's original inbound content.",
                "response_200": "File binary (Content-Disposition: attachment)",
                "permissions": "can_download_file_manager",
                "auth_required": True,
            },
        ],
    },
    {
        "group": "Unprocessed Files (Inbound Queue)",
        "endpoints": [
            {
                "method": "GET",
                "path": "/api/transformation/unprocessed/",
                "description": "List files currently in the trfm_inbound directory awaiting processing.",
                "response_200": [
                    {
                        "filename": "string",
                        "size": "integer — File size in bytes",
                        "modified": "datetime — Last modified timestamp",
                    }
                ],
                "permissions": "can_view_unprocessed",
                "auth_required": True,
            },
            {
                "method": "GET",
                "path": "/api/transformation/unprocessed/download/{filename}/",
                "description": "Download an unprocessed inbound file.",
                "response_200": "File binary (Content-Disposition: attachment)",
                "permissions": "can_download_unprocessed",
                "auth_required": True,
            },
            {
                "method": "DELETE",
                "path": "/api/transformation/unprocessed/delete/{filename}/",
                "description": "Delete an unprocessed file from the inbound directory.",
                "response_200": {"status": "ok"},
                "permissions": "can_delete_unprocessed",
                "auth_required": True,
            },
        ],
    },
    {
        "group": "Dashboard",
        "endpoints": [
            {
                "method": "GET",
                "path": "/api/dashboard/summary/",
                "description": "Get dashboard statistics including packages, runs, rows processed, unprocessed file count, and recent activity.",
                "response_200": {
                    "welcome_message": "string",
                    "user": {"email": "string", "role": "string"},
                    "stats": {
                        "total_packages": "integer",
                        "active_packages": "integer",
                        "total_runs_7d": "integer",
                        "successful_runs_7d": "integer",
                        "failed_runs_7d": "integer",
                        "total_rows_processed_7d": "integer",
                        "last_run_time": "datetime (ISO 8601, nullable)",
                        "last_run_status": "string (nullable)",
                        "server_time": "datetime (ISO 8601)",
                        "unprocessed_files": "integer",
                        "unprocessed_size": "integer — Total bytes",
                    },
                    "recent_activity": "array of activity objects (last 20)",
                    "unread_notifications": "integer",
                },
                "auth_required": True,
            },
            {
                "method": "GET",
                "path": "/api/dashboard/notifications/",
                "description": "List user's notifications (last 50).",
                "response_200": {
                    "notifications": [
                        {
                            "id": "integer",
                            "title": "string",
                            "message": "string",
                            "type": "string — info/warning/error/success",
                            "is_read": "boolean",
                            "link": "string (nullable)",
                            "created_at": "datetime (ISO 8601)",
                        }
                    ],
                    "unread_count": "integer",
                },
                "auth_required": True,
            },
            {
                "method": "POST",
                "path": "/api/dashboard/notifications/{id}/read/",
                "description": "Mark a single notification as read.",
                "response_200": {"status": "ok"},
                "auth_required": True,
            },
            {
                "method": "POST",
                "path": "/api/dashboard/notifications/read-all/",
                "description": "Mark all user's notifications as read.",
                "response_200": {"status": "ok", "marked": "integer"},
                "auth_required": True,
            },
            {
                "method": "DELETE",
                "path": "/api/dashboard/notifications/{id}/dismiss/",
                "description": "Delete a single notification.",
                "response_200": {"status": "ok"},
                "auth_required": True,
            },
            {
                "method": "DELETE",
                "path": "/api/dashboard/notifications/dismiss-all/",
                "description": "Delete all user's notifications.",
                "response_200": {"status": "ok", "deleted": "integer"},
                "auth_required": True,
            },
        ],
    },
]


@method_decorator(staff_member_required, name='dispatch')
class ApiDocumentationView(View):
    """Custom admin view for API Documentation with download button."""

    def get(self, request):
        # If download requested, return JSON
        if request.GET.get('download') == 'json':
            return self._download_json()
        if request.GET.get('download') == 'markdown':
            return self._download_markdown()

        context = {
            'title': 'API Documentation',
            'api_groups': API_DOCUMENTATION,
            'api_json': json.dumps(API_DOCUMENTATION, indent=2, default=str),
            'total_endpoints': sum(len(g['endpoints']) for g in API_DOCUMENTATION),
            'is_popup': False,
            'has_permission': True,
            'site_title': 'ETL Platform Admin',
            'site_header': 'ETL Platform',
        }
        return TemplateResponse(request, 'admin/api_documentation.html', context)

    def _download_json(self):
        data = json.dumps(API_DOCUMENTATION, indent=2, default=str)
        response = HttpResponse(data, content_type='application/json')
        response['Content-Disposition'] = 'attachment; filename="etl_api_documentation.json"'
        return response

    def _download_markdown(self):
        lines = ['# ETL Platform — API Documentation\n\n']
        lines.append(f'> Total Endpoints: {sum(len(g["endpoints"]) for g in API_DOCUMENTATION)}\n\n')
        lines.append('---\n\n')

        for group in API_DOCUMENTATION:
            lines.append(f'## {group["group"]}\n\n')
            for ep in group['endpoints']:
                lines.append(f'### `{ep["method"]}` {ep["path"]}\n\n')
                lines.append(f'{ep["description"]}\n\n')

                auth = '🔒 Required' if ep.get('auth_required') else '🔓 Not required'
                lines.append(f'**Authentication:** {auth}\n\n')

                perms = ep.get('permissions')
                if perms:
                    lines.append(f'**Permission:** `{perms}`\n\n')

                if ep.get('request_body'):
                    lines.append('**Request Body:**\n```json\n')
                    lines.append(json.dumps(ep['request_body'], indent=2, default=str))
                    lines.append('\n```\n\n')

                if ep.get('query_params'):
                    lines.append('**Query Parameters:**\n```json\n')
                    lines.append(json.dumps(ep['query_params'], indent=2, default=str))
                    lines.append('\n```\n\n')

                for key in ['response_200', 'response_201', 'response_204']:
                    if key in ep:
                        code = key.split('_')[1]
                        lines.append(f'**Response ({code}):**\n```json\n')
                        lines.append(json.dumps(ep[key], indent=2, default=str) if isinstance(ep[key], (dict, list)) else str(ep[key]))
                        lines.append('\n```\n\n')

                if ep.get('errors'):
                    lines.append('**Error Responses:**\n')
                    for code, msg in ep['errors'].items():
                        lines.append(f'- `{code}`: {msg}\n')
                    lines.append('\n')

                lines.append('---\n\n')

        content = ''.join(lines)
        response = HttpResponse(content, content_type='text/markdown')
        response['Content-Disposition'] = 'attachment; filename="etl_api_documentation.md"'
        return response
