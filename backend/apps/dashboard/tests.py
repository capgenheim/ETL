"""
Unit tests for the Dashboard app — Audit Trail API.
Tests the unified audit trail endpoint that aggregates
InboundFileLog (Transformation) and SwiftRunLog (SWIFT) entries.
"""
import datetime

from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.transformation.models import (
    Package, UploadedFile, InboundFileLog,
    SwiftPackage, SwiftRunLog,
)


class TestAuditTrailAPI(TestCase):
    """Tests for GET /api/dashboard/audit-trail/"""

    def setUp(self):
        from oauth2_provider.models import Application, AccessToken

        self.user = User.objects.create_user(
            username='auditor', email='auditor@etl.local',
            password='Test@12345', first_name='Audit', last_name='User',
        )
        self.app = Application.objects.create(
            name='test-app-audit',
            client_type=Application.CLIENT_CONFIDENTIAL,
            authorization_grant_type=Application.GRANT_PASSWORD,
            user=self.user,
        )
        self.token = AccessToken.objects.create(
            user=self.user, application=self.app,
            token='test-token-audit-001',
            expires=timezone.now() + datetime.timedelta(hours=1),
            scope='read write',
        )
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token.token}')

        # Seed transformation data
        self.source = UploadedFile.objects.create(
            file_type='source', original_filename='src.csv', file_format='csv',
            headers_json=['A', 'B'], field_count=2, uploaded_by=self.user,
        )
        self.canvas = UploadedFile.objects.create(
            file_type='canvas', original_filename='out.csv', file_format='csv',
            headers_json=['X', 'Y'], field_count=2, uploaded_by=self.user,
        )
        self.trfm_pkg = Package.objects.create(
            name='Transformation Pkg', file_pattern='*.csv',
            source_file=self.source, canvas_file=self.canvas,
            input_format='csv', output_format='csv', output_prefix='out_',
            batch_mode='instant', created_by=self.user,
        )

        # Seed SWIFT package
        self.swift_pkg = SwiftPackage.objects.create(
            name='SWIFT Pkg', message_types=['MT103'],
            output_format='xlsx', processing_mode='instant',
        )

    def _seed_logs(self):
        """Seed sample run logs for both package types."""
        InboundFileLog.objects.create(
            package=self.trfm_pkg, original_filename='bank_statement.csv',
            file_content=b'data', file_size=100, rows_processed=50,
            status='success', output_filename='out_bank.csv',
            run_type='instant',
        )
        InboundFileLog.objects.create(
            package=self.trfm_pkg, original_filename='bad_file.csv',
            file_content=b'bad', file_size=10, rows_processed=0,
            status='failed', error_message='Parse error on line 3',
            run_type='instant',
        )
        SwiftRunLog.objects.create(
            swift_package=self.swift_pkg, original_filename='payment.fin',
            message_type='MT103', status='success', messages_processed=3,
            output_filename='MT103_output.xlsx', run_type='instant',
        )
        SwiftRunLog.objects.create(
            swift_package=self.swift_pkg, original_filename='corrupt.fin',
            message_type='MT540', status='failed',
            error_message='Invalid message format', run_type='manual',
        )

    # ── Basic listing ──

    def test_audit_trail_empty(self):
        resp = self.client.get('/api/dashboard/audit-trail/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['summary']['total'], 0)
        self.assertEqual(resp.data['summary']['success'], 0)
        self.assertEqual(resp.data['summary']['failed'], 0)
        self.assertEqual(resp.data['summary']['success_rate'], 0)
        self.assertEqual(len(resp.data['results']), 0)

    def test_audit_trail_lists_all_entries(self):
        self._seed_logs()
        resp = self.client.get('/api/dashboard/audit-trail/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['summary']['total'], 4)
        self.assertEqual(resp.data['summary']['success'], 2)
        self.assertEqual(resp.data['summary']['failed'], 2)
        self.assertEqual(resp.data['summary']['success_rate'], 50.0)
        self.assertEqual(len(resp.data['results']), 4)

    def test_audit_trail_entry_fields(self):
        self._seed_logs()
        resp = self.client.get('/api/dashboard/audit-trail/')
        entry = resp.data['results'][0]
        required_fields = [
            'id', 'package_type', 'package_name', 'original_filename',
            'output_filename', 'status', 'detail', 'error_message',
            'run_type', 'timestamp',
        ]
        for field in required_fields:
            self.assertIn(field, entry, f'Missing field: {field}')

    # ── Filter by status ──

    def test_filter_by_status_success(self):
        self._seed_logs()
        resp = self.client.get('/api/dashboard/audit-trail/?status=success')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['summary']['total'], 2)
        self.assertTrue(all(e['status'] == 'success' for e in resp.data['results']))

    def test_filter_by_status_failed(self):
        self._seed_logs()
        resp = self.client.get('/api/dashboard/audit-trail/?status=failed')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['summary']['total'], 2)
        self.assertTrue(all(e['status'] == 'failed' for e in resp.data['results']))

    # ── Filter by package type ──

    def test_filter_by_package_type_transformation(self):
        self._seed_logs()
        resp = self.client.get('/api/dashboard/audit-trail/?package_type=transformation')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['summary']['total'], 2)
        self.assertTrue(all(e['package_type'] == 'Transformation' for e in resp.data['results']))

    def test_filter_by_package_type_swift(self):
        self._seed_logs()
        resp = self.client.get('/api/dashboard/audit-trail/?package_type=swift')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['summary']['total'], 2)
        self.assertTrue(all(e['package_type'] == 'SWIFT' for e in resp.data['results']))

    # ── Search ──

    def test_search_by_filename(self):
        self._seed_logs()
        resp = self.client.get('/api/dashboard/audit-trail/?search=bank_statement')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['summary']['total'], 1)
        self.assertIn('bank_statement', resp.data['results'][0]['original_filename'])

    def test_search_by_package_name(self):
        self._seed_logs()
        resp = self.client.get('/api/dashboard/audit-trail/?search=SWIFT Pkg')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['summary']['total'], 2)

    # ── Combined filters ──

    def test_combined_status_and_type_filter(self):
        self._seed_logs()
        resp = self.client.get('/api/dashboard/audit-trail/?status=failed&package_type=swift')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['summary']['total'], 1)
        self.assertEqual(resp.data['results'][0]['package_type'], 'SWIFT')
        self.assertEqual(resp.data['results'][0]['status'], 'failed')

    # ── Pagination ──

    def test_pagination_defaults(self):
        self._seed_logs()
        resp = self.client.get('/api/dashboard/audit-trail/')
        self.assertEqual(resp.data['pagination']['page'], 1)
        self.assertEqual(resp.data['pagination']['page_size'], 50)
        self.assertEqual(resp.data['pagination']['total_items'], 4)

    def test_pagination_custom_page_size(self):
        self._seed_logs()
        resp = self.client.get('/api/dashboard/audit-trail/?page_size=2&page=1')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data['results']), 2)
        self.assertEqual(resp.data['pagination']['total_pages'], 2)

    def test_pagination_page_2(self):
        self._seed_logs()
        resp = self.client.get('/api/dashboard/audit-trail/?page_size=2&page=2')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data['results']), 2)

    # ── Authentication required ──

    def test_unauthenticated_returns_401(self):
        unauthenticated_client = APIClient()
        resp = unauthenticated_client.get('/api/dashboard/audit-trail/')
        self.assertEqual(resp.status_code, 401)

    # ── Sorted by timestamp descending ──

    def test_results_sorted_by_timestamp_desc(self):
        self._seed_logs()
        resp = self.client.get('/api/dashboard/audit-trail/')
        timestamps = [e['timestamp'] for e in resp.data['results']]
        self.assertEqual(timestamps, sorted(timestamps, reverse=True))


class TestUploadSegregateAPI(TestCase):
    """Tests for POST /api/dashboard/upload-segregate/"""

    def setUp(self):
        import tempfile
        from oauth2_provider.models import Application, AccessToken

        self.user = User.objects.create_user(
            username='uploader', email='uploader@etl.local',
            password='Test@12345',
        )
        self.app = Application.objects.create(
            name='test-app-upload-seg',
            client_type=Application.CLIENT_CONFIDENTIAL,
            authorization_grant_type=Application.GRANT_PASSWORD,
            user=self.user,
        )
        self.token = AccessToken.objects.create(
            user=self.user, application=self.app,
            token='test-token-upload-seg-001',
            expires=timezone.now() + datetime.timedelta(hours=1),
            scope='read write',
        )
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token.token}')

        # Use temp dirs for testing
        self.trfm_dir = tempfile.mkdtemp()
        self.sft_dir = tempfile.mkdtemp()

    def _make_file(self, name='test.csv', content=b'col1,col2\na,b'):
        from django.core.files.uploadedfile import SimpleUploadedFile
        return SimpleUploadedFile(name, content)

    @override_settings()
    def test_upload_to_transformation(self):
        from django.conf import settings
        settings.TRFM_INBOUND_DIR = self.trfm_dir
        f = self._make_file('data.csv')
        resp = self.client.post('/api/dashboard/upload-segregate/', {
            'file': f,
            'target': 'transformation',
        }, format='multipart')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['status'], 'success')
        self.assertEqual(resp.data['target'], 'transformation')
        # Verify file exists
        import os
        self.assertTrue(os.path.exists(os.path.join(self.trfm_dir, 'data.csv')))

    @override_settings()
    def test_upload_to_swift(self):
        from django.conf import settings
        settings.SFT_INBOUND_DIR = self.sft_dir
        f = self._make_file('payment.fin', b'{1:F01...}')
        resp = self.client.post('/api/dashboard/upload-segregate/', {
            'file': f,
            'target': 'swift',
        }, format='multipart')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['status'], 'success')
        self.assertEqual(resp.data['target'], 'swift')
        import os
        self.assertTrue(os.path.exists(os.path.join(self.sft_dir, 'payment.fin')))

    def test_missing_file_returns_400(self):
        resp = self.client.post('/api/dashboard/upload-segregate/', {
            'target': 'transformation',
        }, format='multipart')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('error', resp.data)

    def test_invalid_target_returns_400(self):
        f = self._make_file()
        resp = self.client.post('/api/dashboard/upload-segregate/', {
            'file': f,
            'target': 'invalid',
        }, format='multipart')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('error', resp.data)

    def test_unauthenticated_returns_401(self):
        unauthenticated_client = APIClient()
        f = self._make_file()
        resp = unauthenticated_client.post('/api/dashboard/upload-segregate/', {
            'file': f,
            'target': 'transformation',
        }, format='multipart')
        self.assertEqual(resp.status_code, 401)

    @override_settings()
    def test_duplicate_filename_appends_suffix(self):
        import os
        from django.conf import settings
        settings.TRFM_INBOUND_DIR = self.trfm_dir
        # Create initial file
        with open(os.path.join(self.trfm_dir, 'dup.csv'), 'w') as fp:
            fp.write('existing')

        f = self._make_file('dup.csv', b'new-content')
        resp = self.client.post('/api/dashboard/upload-segregate/', {
            'file': f,
            'target': 'transformation',
        }, format='multipart')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['filename'], 'dup_1.csv')
        self.assertTrue(os.path.exists(os.path.join(self.trfm_dir, 'dup_1.csv')))
