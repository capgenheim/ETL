"""
Unit tests for the Transformation app.
Tests header extraction service and API endpoints.
"""
import csv
import io
import os
import tempfile

from django.test import TestCase, override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

import openpyxl

from apps.accounts.models import User
from apps.transformation.models import UploadedFile
from apps.transformation.services import (
    extract_headers,
    HeaderExtractionError,
    get_file_extension,
)

TEMP_MEDIA = tempfile.mkdtemp()


# ─── Header Extraction Tests ───────────────────────────────────────────

class TestGetFileExtension(TestCase):
    def test_xlsx(self):
        self.assertEqual(get_file_extension('report.xlsx'), 'xlsx')

    def test_xls(self):
        self.assertEqual(get_file_extension('legacy.XLS'), 'xls')

    def test_csv(self):
        self.assertEqual(get_file_extension('data.csv'), 'csv')

    def test_unsupported(self):
        self.assertEqual(get_file_extension('image.png'), 'png')


class TestExtractHeadersCsv(TestCase):
    def test_extracts_csv_headers(self):
        content = 'Name,Age,Email,Department\nJohn,30,john@test.com,IT'
        f = io.BytesIO(content.encode('utf-8'))
        result = extract_headers(f, 'test.csv')
        self.assertEqual(result['headers'], ['Name', 'Age', 'Email', 'Department'])
        self.assertEqual(result['field_count'], 4)
        self.assertEqual(result['file_format'], 'csv')

    def test_csv_with_bom(self):
        # Realistic BOM-prefixed CSV (as Windows Excel would create)
        content = 'ID,Name,Value'
        f = io.BytesIO(content.encode('utf-8-sig'))
        result = extract_headers(f, 'bom.csv')
        self.assertEqual(result['headers'], ['ID', 'Name', 'Value'])

    def test_csv_empty(self):
        f = io.BytesIO(b'')
        result = extract_headers(f, 'empty.csv')
        self.assertEqual(result['headers'], [])
        self.assertEqual(result['field_count'], 0)

    def test_csv_blanks_filtered(self):
        """Blank headers in the middle or end should be excluded."""
        content = 'Name,,Age,,Email,'
        f = io.BytesIO(content.encode('utf-8'))
        result = extract_headers(f, 'gaps.csv')
        self.assertEqual(result['headers'], ['Name', 'Age', 'Email'])
        self.assertEqual(result['field_count'], 3)


class TestExtractHeadersXlsx(TestCase):
    def _make_xlsx(self, headers):
        """Create an in-memory xlsx file with given headers."""
        wb = openpyxl.Workbook()
        ws = wb.active
        for col, header in enumerate(headers, 1):
            ws.cell(row=1, column=col, value=header)
        # Add a data row to ensure only headers are extracted
        for col in range(1, len(headers) + 1):
            ws.cell(row=2, column=col, value=f'data_{col}')
        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)
        return buf

    def test_extracts_xlsx_headers(self):
        headers = ['Account No', 'Balance', 'Currency', 'Date']
        f = self._make_xlsx(headers)
        result = extract_headers(f, 'report.xlsx')
        self.assertEqual(result['headers'], headers)
        self.assertEqual(result['field_count'], 4)
        self.assertEqual(result['file_format'], 'xlsx')

    def test_xlsx_empty_workbook(self):
        wb = openpyxl.Workbook()
        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)
        result = extract_headers(buf, 'empty.xlsx')
        self.assertEqual(result['headers'], [])


class TestExtractHeadersValidation(TestCase):
    def test_unsupported_format_raises(self):
        f = io.BytesIO(b'not-an-image')
        with self.assertRaises(HeaderExtractionError) as ctx:
            extract_headers(f, 'file.png')
        self.assertIn('Unsupported format', str(ctx.exception))


# ─── API Tests ──────────────────────────────────────────────────────────

@override_settings(MEDIA_ROOT=TEMP_MEDIA)
class TestFileUploadAPI(TestCase):
    def setUp(self):
        from oauth2_provider.models import Application, AccessToken
        from django.utils import timezone
        import datetime

        self.user = User.objects.create_user(
            username='tester',
            email='tester@etl.local',
            password='Test@12345',
        )
        self.app = Application.objects.create(
            name='test-app',
            client_type=Application.CLIENT_CONFIDENTIAL,
            authorization_grant_type=Application.GRANT_PASSWORD,
            user=self.user,
        )
        self.token = AccessToken.objects.create(
            user=self.user,
            application=self.app,
            token='test-token-upload-123',
            expires=timezone.now() + datetime.timedelta(hours=1),
            scope='read write',
        )
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token.token}')

    def _make_csv_file(self, name='test.csv', headers=None):
        if headers is None:
            headers = ['Name', 'Age', 'Email']
        content = ','.join(headers) + '\nJohn,30,john@test.com'
        return SimpleUploadedFile(name, content.encode('utf-8'), content_type='text/csv')

    def _make_xlsx_file(self, name='test.xlsx', headers=None):
        if headers is None:
            headers = ['Col_A', 'Col_B', 'Col_C']
        wb = openpyxl.Workbook()
        ws = wb.active
        for col, h in enumerate(headers, 1):
            ws.cell(row=1, column=col, value=h)
        buf = io.BytesIO()
        wb.save(buf)
        return SimpleUploadedFile(name, buf.getvalue(),
                                  content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

    def test_upload_csv_source(self):
        f = self._make_csv_file()
        resp = self.client.post('/api/transformation/upload/', {
            'files': [f],
            'file_type': 'source',
        }, format='multipart')
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(len(resp.data['uploaded']), 1)
        uploaded = resp.data['uploaded'][0]
        self.assertEqual(uploaded['file_type'], 'source')
        self.assertEqual(uploaded['field_count'], 3)
        self.assertEqual(uploaded['headers_json'], ['Name', 'Age', 'Email'])

    def test_upload_xlsx_canvas(self):
        f = self._make_xlsx_file(headers=['Balance', 'Date', 'Account'])
        resp = self.client.post('/api/transformation/upload/', {
            'files': [f],
            'file_type': 'canvas',
        }, format='multipart')
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['uploaded'][0]['file_format'], 'xlsx')
        self.assertEqual(resp.data['uploaded'][0]['headers_json'], ['Balance', 'Date', 'Account'])

    def test_upload_multiple_files(self):
        f1 = self._make_csv_file('file1.csv', ['A', 'B'])
        f2 = self._make_csv_file('file2.csv', ['X', 'Y', 'Z'])
        resp = self.client.post('/api/transformation/upload/', {
            'files': [f1, f2],
            'file_type': 'source',
        }, format='multipart')
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(len(resp.data['uploaded']), 2)

    def test_upload_no_file_type_returns_400(self):
        f = self._make_csv_file()
        resp = self.client.post('/api/transformation/upload/', {
            'files': [f],
        }, format='multipart')
        self.assertEqual(resp.status_code, 400)

    def test_upload_invalid_format(self):
        f = SimpleUploadedFile('bad.png', b'fake-image', content_type='image/png')
        resp = self.client.post('/api/transformation/upload/', {
            'files': [f],
            'file_type': 'source',
        }, format='multipart')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('errors', resp.data)

    def test_upload_duplicate_rejected(self):
        """Re-uploading a file with the same name and type should return a duplicate error."""
        f1 = self._make_csv_file('report.csv', ['A', 'B'])
        resp1 = self.client.post('/api/transformation/upload/', {
            'files': [f1],
            'file_type': 'source',
        }, format='multipart')
        self.assertEqual(resp1.status_code, 201)

        # Upload same filename again for the same type
        f2 = self._make_csv_file('report.csv', ['X', 'Y'])
        resp2 = self.client.post('/api/transformation/upload/', {
            'files': [f2],
            'file_type': 'source',
        }, format='multipart')
        self.assertEqual(resp2.status_code, 400)  # No successful uploads
        self.assertEqual(len(resp2.data.get('errors', [])), 1)
        self.assertIn('Duplicate', resp2.data['errors'][0]['error'])

    def test_same_filename_different_type_allowed(self):
        """Same filename is allowed across different types (source vs canvas)."""
        f1 = self._make_csv_file('data.csv', ['A', 'B'])
        resp1 = self.client.post('/api/transformation/upload/', {
            'files': [f1],
            'file_type': 'source',
        }, format='multipart')
        self.assertEqual(resp1.status_code, 201)

        f2 = self._make_csv_file('data.csv', ['X', 'Y'])
        resp2 = self.client.post('/api/transformation/upload/', {
            'files': [f2],
            'file_type': 'canvas',
        }, format='multipart')
        self.assertEqual(resp2.status_code, 201)  # Different type, should succeed


@override_settings(MEDIA_ROOT=TEMP_MEDIA)
class TestFileListAndDeleteAPI(TestCase):
    def setUp(self):
        from oauth2_provider.models import Application, AccessToken
        from django.utils import timezone
        import datetime

        self.user = User.objects.create_user(
            username='lister', email='lister@etl.local', password='Test@12345',
        )
        self.app = Application.objects.create(
            name='test-app-list', client_type=Application.CLIENT_CONFIDENTIAL,
            authorization_grant_type=Application.GRANT_PASSWORD, user=self.user,
        )
        self.token = AccessToken.objects.create(
            user=self.user, application=self.app,
            token='test-token-list-456',
            expires=timezone.now() + datetime.timedelta(hours=1),
            scope='read write',
        )
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token.token}')

        # Seed files
        self.source_file = UploadedFile.objects.create(
            file_type='source', original_filename='data.csv', file_format='csv',
            headers_json=['A', 'B', 'C'], field_count=3,
            uploaded_by=self.user, file='uploads/source/data.csv',
        )
        self.canvas_file = UploadedFile.objects.create(
            file_type='canvas', original_filename='canvas.xlsx', file_format='xlsx',
            headers_json=['X', 'Y'], field_count=2,
            uploaded_by=self.user, file='uploads/canvas/canvas.xlsx',
        )

    def test_list_all_files(self):
        resp = self.client.get('/api/transformation/files/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 2)

    def test_list_source_files_only(self):
        resp = self.client.get('/api/transformation/files/?type=source')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]['file_type'], 'source')

    def test_list_canvas_files_only(self):
        resp = self.client.get('/api/transformation/files/?type=canvas')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]['file_type'], 'canvas')

    def test_delete_file(self):
        resp = self.client.delete(f'/api/transformation/files/{self.source_file.id}/')
        self.assertEqual(resp.status_code, 204)
        self.assertFalse(UploadedFile.objects.filter(id=self.source_file.id).exists())


# ─── Package CRUD Tests ────────────────────────────────────────────────

@override_settings(MEDIA_ROOT=TEMP_MEDIA)
class TestPackageCRUDAPI(TestCase):
    def setUp(self):
        from oauth2_provider.models import Application, AccessToken
        from django.utils import timezone
        import datetime

        self.user = User.objects.create_user(
            username='pkguser', email='pkguser@etl.local', password='Test@12345',
            first_name='John', last_name='Doe',
        )
        self.app = Application.objects.create(
            name='test-app-pkg', client_type=Application.CLIENT_CONFIDENTIAL,
            authorization_grant_type=Application.GRANT_PASSWORD, user=self.user,
        )
        self.token = AccessToken.objects.create(
            user=self.user, application=self.app,
            token='test-token-pkg-789',
            expires=timezone.now() + datetime.timedelta(hours=1),
            scope='read write',
        )
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token.token}')

        # Seed source and canvas files
        self.source = UploadedFile.objects.create(
            file_type='source', original_filename='bank.csv', file_format='csv',
            headers_json=['Date', 'Description', 'Amount', 'Balance'],
            field_count=4, uploaded_by=self.user,
        )
        self.canvas = UploadedFile.objects.create(
            file_type='canvas', original_filename='output.xlsx', file_format='xlsx',
            headers_json=['TransDate', 'Desc', 'Value'],
            field_count=3, uploaded_by=self.user,
        )

    def _create_package(self, **overrides):
        """Helper to create a package via API."""
        data = {
            'name': 'Test Package',
            'file_pattern': 'MBB_*.csv',
            'source_file': self.source.id,
            'canvas_file': self.canvas.id,
            'input_format': 'csv',
            'output_format': 'xlsx',
            'output_prefix': 'mbb_output_',
            'batch_mode': 'instant',
            'batch_interval_minutes': 0,
        }
        data.update(overrides)
        return self.client.post('/api/transformation/packages/create/', data, format='json')

    # ── Create ──

    def test_create_package(self):
        resp = self._create_package()
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['name'], 'Test Package')
        self.assertEqual(resp.data['file_pattern'], 'MBB_*.csv')
        self.assertEqual(resp.data['status'], 'inactive')
        self.assertEqual(resp.data['mapping_status'], 'unmapped')
        self.assertEqual(resp.data['source_file_name'], 'bank.csv')
        self.assertEqual(resp.data['canvas_file_name'], 'output.xlsx')
        self.assertEqual(resp.data['created_by_name'], 'John Doe')
        self.assertEqual(resp.data['created_by_email'], 'pkguser@etl.local')

    def test_create_package_scheduled(self):
        resp = self._create_package(batch_mode='scheduled', batch_interval_minutes=120)
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['batch_mode'], 'scheduled')
        self.assertEqual(resp.data['batch_interval_minutes'], 120)

    def test_create_package_missing_name(self):
        resp = self._create_package(name='')
        self.assertEqual(resp.status_code, 400)

    # ── List ──

    def test_list_packages(self):
        self._create_package(name='Package A')
        self._create_package(name='Package B')
        resp = self.client.get('/api/transformation/packages/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 2)

    def test_list_packages_filter_status(self):
        self._create_package(name='Package A')
        resp = self.client.get('/api/transformation/packages/?status=inactive')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 1)
        resp2 = self.client.get('/api/transformation/packages/?status=active')
        self.assertEqual(len(resp2.data), 0)

    # ── Detail / Update / Delete ──

    def test_get_package_detail(self):
        create_resp = self._create_package()
        pkg_id = create_resp.data['id']
        resp = self.client.get(f'/api/transformation/packages/{pkg_id}/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['name'], 'Test Package')
        # Check source/canvas headers are included
        self.assertEqual(resp.data['source_headers'], ['Date', 'Description', 'Amount', 'Balance'])
        self.assertEqual(resp.data['canvas_headers'], ['TransDate', 'Desc', 'Value'])

    def test_update_package(self):
        create_resp = self._create_package()
        pkg_id = create_resp.data['id']
        resp = self.client.patch(
            f'/api/transformation/packages/{pkg_id}/',
            {'name': 'Updated Package', 'output_prefix': 'new_prefix_'},
            format='json',
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['name'], 'Updated Package')
        self.assertEqual(resp.data['output_prefix'], 'new_prefix_')

    def test_delete_package(self):
        create_resp = self._create_package()
        pkg_id = create_resp.data['id']
        resp = self.client.delete(f'/api/transformation/packages/{pkg_id}/')
        self.assertEqual(resp.status_code, 204)

    # ── Status Control ──

    def test_start_package(self):
        create_resp = self._create_package(package_type='passthrough', source_file=None, canvas_file=None)
        pkg_id = create_resp.data['id']
        resp = self.client.post(f'/api/transformation/packages/{pkg_id}/start/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['status'], 'active')

    def test_pause_package(self):
        create_resp = self._create_package(package_type='passthrough', source_file=None, canvas_file=None)
        pkg_id = create_resp.data['id']
        # Start first
        self.client.post(f'/api/transformation/packages/{pkg_id}/start/')
        resp = self.client.post(f'/api/transformation/packages/{pkg_id}/pause/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['status'], 'paused')

    def test_stop_package(self):
        create_resp = self._create_package(package_type='passthrough', source_file=None, canvas_file=None)
        pkg_id = create_resp.data['id']
        self.client.post(f'/api/transformation/packages/{pkg_id}/start/')
        resp = self.client.post(f'/api/transformation/packages/{pkg_id}/stop/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['status'], 'inactive')

    def test_invalid_package_action(self):
        create_resp = self._create_package()
        pkg_id = create_resp.data['id']
        resp = self.client.post(f'/api/transformation/packages/{pkg_id}/restart/')
        self.assertEqual(resp.status_code, 400)

    def test_package_not_found(self):
        resp = self.client.post('/api/transformation/packages/99999/start/')
        self.assertEqual(resp.status_code, 404)


# ─── Field Mapping Tests ───────────────────────────────────────────────

@override_settings(MEDIA_ROOT=TEMP_MEDIA)
class TestFieldMappingAPI(TestCase):
    def setUp(self):
        from oauth2_provider.models import Application, AccessToken
        from django.utils import timezone
        from apps.transformation.models import Package
        import datetime

        self.user = User.objects.create_user(
            username='mapper', email='mapper@etl.local', password='Test@12345',
        )
        self.app = Application.objects.create(
            name='test-app-map', client_type=Application.CLIENT_CONFIDENTIAL,
            authorization_grant_type=Application.GRANT_PASSWORD, user=self.user,
        )
        self.token = AccessToken.objects.create(
            user=self.user, application=self.app,
            token='test-token-map-101',
            expires=timezone.now() + datetime.timedelta(hours=1),
            scope='read write',
        )
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token.token}')

        self.source = UploadedFile.objects.create(
            file_type='source', original_filename='src.csv', file_format='csv',
            headers_json=['ColA', 'ColB', 'ColC', 'ColD'],
            field_count=4, uploaded_by=self.user,
        )
        self.canvas = UploadedFile.objects.create(
            file_type='canvas', original_filename='out.csv', file_format='csv',
            headers_json=['TargetX', 'TargetY', 'TargetZ'],
            field_count=3, uploaded_by=self.user,
        )
        self.package = Package.objects.create(
            name='Map Test Pkg', file_pattern='TEST_*.csv',
            source_file=self.source, canvas_file=self.canvas,
            input_format='csv', output_format='csv', output_prefix='test_',
            batch_mode='instant', created_by=self.user,
        )

    def test_save_mappings(self):
        mappings = [
            {'source_header': 'ColA', 'canvas_header': 'TargetX', 'order': 0},
            {'source_header': 'ColB', 'canvas_header': 'TargetY', 'order': 1},
            {'source_header': 'ColC', 'canvas_header': 'TargetZ', 'order': 2},
        ]
        resp = self.client.post(
            f'/api/transformation/packages/{self.package.id}/mappings/',
            mappings, format='json',
        )
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(len(resp.data), 3)
        # Verify mapping_status changed to mapped
        self.package.refresh_from_db()
        self.assertEqual(self.package.mapping_status, 'mapped')

    def test_list_mappings(self):
        from apps.transformation.models import FieldMapping
        FieldMapping.objects.create(
            package=self.package, source_header='ColA',
            canvas_header='TargetX', order=0,
        )
        resp = self.client.get(f'/api/transformation/packages/{self.package.id}/mappings/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]['source_header'], 'ColA')

    def test_replace_mappings(self):
        """Saving new mappings should replace existing ones."""
        from apps.transformation.models import FieldMapping
        FieldMapping.objects.create(
            package=self.package, source_header='ColA',
            canvas_header='TargetX', order=0,
        )
        # Replace with different mappings
        new_mappings = [
            {'source_header': 'ColD', 'canvas_header': 'TargetX', 'order': 0},
            {'source_header': 'ColC', 'canvas_header': 'TargetZ', 'order': 1},
        ]
        resp = self.client.post(
            f'/api/transformation/packages/{self.package.id}/mappings/',
            new_mappings, format='json',
        )
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(len(resp.data), 2)
        # Old mapping should be gone
        self.assertEqual(FieldMapping.objects.filter(package=self.package).count(), 2)

    def test_invalid_mapping_format(self):
        """Sending non-list should return 400."""
        resp = self.client.post(
            f'/api/transformation/packages/{self.package.id}/mappings/',
            {'source_header': 'ColA', 'canvas_header': 'TargetX'},
            format='json',
        )
        self.assertEqual(resp.status_code, 400)

    def test_mapping_not_found_package(self):
        resp = self.client.get('/api/transformation/packages/99999/mappings/')
        self.assertEqual(resp.status_code, 404)


# ─── SWIFT Package Tests ──────────────────────────────────────────────

class TestSwiftPackageAPI(TestCase):
    """Tests for SWIFT Package CRUD, status control, and run logs."""

    def setUp(self):
        from oauth2_provider.models import Application, AccessToken
        from django.utils import timezone
        import datetime

        self.user = User.objects.create_user(
            username='swiftuser', email='swiftuser@etl.local',
            password='Test@12345', first_name='Swift', last_name='Tester',
        )
        self.app = Application.objects.create(
            name='test-app-swift', client_type=Application.CLIENT_CONFIDENTIAL,
            authorization_grant_type=Application.GRANT_PASSWORD, user=self.user,
        )
        self.token = AccessToken.objects.create(
            user=self.user, application=self.app,
            token='test-token-swift-001',
            expires=timezone.now() + datetime.timedelta(hours=1),
            scope='read write',
        )
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token.token}')

    def _create_package(self, **overrides):
        data = {
            'name': 'SWIFT Test Package',
            'description': 'Unit test package',
            'message_types': ['MT103', 'MT540'],
            'output_format': 'xlsx',
            'processing_mode': 'instant',
            'file_pattern': '*.fin',
            'status': 'active',
        }
        data.update(overrides)
        return self.client.post('/api/transformation/swift-packages/', data, format='json')

    # ── Create ──

    def test_create_swift_package(self):
        resp = self._create_package()
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['name'], 'SWIFT Test Package')
        self.assertEqual(resp.data['message_types'], ['MT103', 'MT540'])
        self.assertEqual(resp.data['status'], 'active')
        self.assertIn('run_log_summary', resp.data)

    def test_create_duplicate_name(self):
        self._create_package()
        resp = self._create_package()
        self.assertEqual(resp.status_code, 400)

    # ── List ──

    def test_list_swift_packages(self):
        self._create_package(name='Pkg A')
        self._create_package(name='Pkg B')
        resp = self.client.get('/api/transformation/swift-packages/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 2)

    # ── Detail ──

    def test_get_swift_package_detail(self):
        create_resp = self._create_package()
        pkg_id = create_resp.data['id']
        resp = self.client.get(f'/api/transformation/swift-packages/{pkg_id}/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['name'], 'SWIFT Test Package')

    # ── Update ──

    def test_update_swift_package(self):
        create_resp = self._create_package()
        pkg_id = create_resp.data['id']
        resp = self.client.put(
            f'/api/transformation/swift-packages/{pkg_id}/',
            {'name': 'Updated SWIFT Pkg', 'description': 'Changed'},
            format='json',
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['name'], 'Updated SWIFT Pkg')

    # ── Delete ──

    def test_delete_swift_package(self):
        create_resp = self._create_package()
        pkg_id = create_resp.data['id']
        resp = self.client.delete(f'/api/transformation/swift-packages/{pkg_id}/')
        self.assertEqual(resp.status_code, 200)

    # ── Status Control ──

    def test_start_swift_package(self):
        create_resp = self._create_package(status='inactive')
        pkg_id = create_resp.data['id']
        resp = self.client.post(f'/api/transformation/swift-packages/{pkg_id}/start/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['status'], 'active')

    def test_pause_swift_package(self):
        create_resp = self._create_package()
        pkg_id = create_resp.data['id']
        resp = self.client.post(f'/api/transformation/swift-packages/{pkg_id}/pause/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['status'], 'paused')

    def test_stop_swift_package(self):
        create_resp = self._create_package()
        pkg_id = create_resp.data['id']
        resp = self.client.post(f'/api/transformation/swift-packages/{pkg_id}/stop/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['status'], 'inactive')

    def test_invalid_swift_action(self):
        create_resp = self._create_package()
        pkg_id = create_resp.data['id']
        resp = self.client.post(f'/api/transformation/swift-packages/{pkg_id}/restart/')
        self.assertEqual(resp.status_code, 400)

    # ── Run Logs ──

    def test_swift_run_logs_empty(self):
        create_resp = self._create_package()
        pkg_id = create_resp.data['id']
        resp = self.client.get(f'/api/transformation/swift-packages/{pkg_id}/run-logs/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 0)

    def test_swift_run_logs_with_entries(self):
        from apps.transformation.models import SwiftPackage, SwiftRunLog
        create_resp = self._create_package()
        pkg_id = create_resp.data['id']
        pkg = SwiftPackage.objects.get(pk=pkg_id)

        # Seed run logs
        SwiftRunLog.objects.create(
            swift_package=pkg, original_filename='test.fin',
            message_type='MT103', status='success', messages_processed=3,
        )
        SwiftRunLog.objects.create(
            swift_package=pkg, original_filename='bad.fin',
            message_type='MT540', status='failed', error_message='Parse error',
        )

        resp = self.client.get(f'/api/transformation/swift-packages/{pkg_id}/run-logs/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 2)

    def test_swift_run_log_summary_in_list(self):
        from apps.transformation.models import SwiftPackage, SwiftRunLog
        create_resp = self._create_package()
        pkg_id = create_resp.data['id']
        pkg = SwiftPackage.objects.get(pk=pkg_id)

        SwiftRunLog.objects.create(
            swift_package=pkg, original_filename='a.fin',
            message_type='MT103', status='success', messages_processed=5,
        )
        SwiftRunLog.objects.create(
            swift_package=pkg, original_filename='b.fin',
            message_type='MT540', status='failed',
        )

        resp = self.client.get('/api/transformation/swift-packages/')
        self.assertEqual(resp.status_code, 200)
        summary = resp.data[0]['run_log_summary']
        self.assertEqual(summary['total'], 2)
        self.assertEqual(summary['success'], 1)
        self.assertEqual(summary['failed'], 1)
        self.assertIsNotNone(summary['last_run'])


# ─── Directory Registry API Tests ──────────────────────────────────────

@override_settings(
    TRFM_INBOUND_DIR=os.path.join(tempfile.mkdtemp(), 'trfm_inbound'),
    TRFM_OUTBOUND_DIR=os.path.join(tempfile.mkdtemp(), 'trfm_outbound'),
)
class TestDirectoryRegistryAPI(TestCase):
    """Tests for directory list/create endpoint including physical dir creation."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='dirtest', email='dirtest@example.com', password='Test@12345',
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        # Ensure base dirs exist
        from django.conf import settings
        os.makedirs(settings.TRFM_INBOUND_DIR, exist_ok=True)
        os.makedirs(settings.TRFM_OUTBOUND_DIR, exist_ok=True)

    def test_list_directories_empty(self):
        resp = self.client.get('/api/transformation/directories/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 0)

    def test_create_delivery_directory(self):
        resp = self.client.post('/api/transformation/directories/', {
            'name': 'imatch', 'dir_type': 'delivery',
        })
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['name'], 'imatch')
        self.assertEqual(resp.data['dir_type'], 'delivery')

    def test_create_delivery_creates_physical_dir(self):
        from django.conf import settings
        self.client.post('/api/transformation/directories/', {
            'name': 'testdelivery', 'dir_type': 'delivery',
        })
        self.assertTrue(os.path.isdir(os.path.join(settings.TRFM_OUTBOUND_DIR, 'testdelivery')))

    def test_create_pool_directory(self):
        resp = self.client.post('/api/transformation/directories/', {
            'name': 'maybank', 'dir_type': 'pool',
        })
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['name'], 'maybank')
        self.assertEqual(resp.data['dir_type'], 'pool')

    def test_create_pool_mirrors_outbound(self):
        """Pool creation must create inbound/<name>, outbound/<name>/ori, outbound/<name>/convert_transform."""
        from django.conf import settings
        self.client.post('/api/transformation/directories/', {
            'name': 'cimb', 'dir_type': 'pool',
        })
        self.assertTrue(os.path.isdir(os.path.join(settings.TRFM_INBOUND_DIR, 'cimb')))
        self.assertTrue(os.path.isdir(os.path.join(settings.TRFM_OUTBOUND_DIR, 'cimb', 'ori')))
        self.assertTrue(os.path.isdir(os.path.join(settings.TRFM_OUTBOUND_DIR, 'cimb', 'convert_transform')))

    def test_duplicate_name_rejected(self):
        self.client.post('/api/transformation/directories/', {
            'name': 'duplicate', 'dir_type': 'delivery',
        })
        resp = self.client.post('/api/transformation/directories/', {
            'name': 'duplicate', 'dir_type': 'delivery',
        })
        self.assertEqual(resp.status_code, 400)

    def test_invalid_name_rejected(self):
        resp = self.client.post('/api/transformation/directories/', {
            'name': 'My Dir!@#', 'dir_type': 'pool',
        })
        self.assertEqual(resp.status_code, 400)

    def test_list_filter_by_type(self):
        self.client.post('/api/transformation/directories/', {'name': 'pool1', 'dir_type': 'pool'})
        self.client.post('/api/transformation/directories/', {'name': 'del1', 'dir_type': 'delivery'})
        resp = self.client.get('/api/transformation/directories/?type=delivery')
        self.assertEqual(resp.status_code, 200)
        names = [d['name'] for d in resp.data]
        self.assertIn('del1', names)
        self.assertNotIn('pool1', names)


# ─── Package Type API Tests ────────────────────────────────────────────

class TestPackageTypeAPI(TestCase):
    """Tests for package creation with different package_type values."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='pkgtype', email='pkgtype@example.com', password='Test@12345',
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        # Create source and canvas files for transformation packages
        self.source = UploadedFile.objects.create(
            file_type='source', original_filename='src.csv', file_format='csv',
            headers_json=['A', 'B'], field_count=2, uploaded_by=self.user,
        )
        self.canvas = UploadedFile.objects.create(
            file_type='canvas', original_filename='canvas.csv', file_format='csv',
            headers_json=['X', 'Y'], field_count=2, uploaded_by=self.user,
        )

    def _base_payload(self, **overrides):
        payload = {
            'name': 'Test Pkg', 'file_pattern': '*.csv',
            'package_type': 'transformation',
            'filename_mode': 'prefix',
            'input_format': 'csv', 'output_format': 'csv',
            'output_prefix': 'test_', 'batch_mode': 'instant',
            'source_file': self.source.id, 'canvas_file': self.canvas.id,
        }
        payload.update(overrides)
        return payload

    def test_create_transformation_package(self):
        resp = self.client.post('/api/transformation/packages/create/',
                                self._base_payload(), format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['package_type'], 'transformation')

    def test_create_passthrough_package(self):
        resp = self.client.post('/api/transformation/packages/create/',
                                self._base_payload(
                                    package_type='passthrough',
                                    source_file=None, canvas_file=None,
                                ), format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['package_type'], 'passthrough')

    def test_create_convert_package(self):
        resp = self.client.post('/api/transformation/packages/create/',
                                self._base_payload(
                                    package_type='convert',
                                    source_file=None, canvas_file=None,
                                    input_format='csv', output_format='xlsx',
                                    output_prefix='conv_',
                                ), format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['package_type'], 'convert')

    def test_convert_same_format_rejected(self):
        resp = self.client.post('/api/transformation/packages/create/',
                                self._base_payload(
                                    package_type='convert',
                                    source_file=None, canvas_file=None,
                                    input_format='csv', output_format='csv',
                                ), format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('output_format', resp.data)

    def test_convert_to_xls_rejected(self):
        resp = self.client.post('/api/transformation/packages/create/',
                                self._base_payload(
                                    package_type='convert',
                                    source_file=None, canvas_file=None,
                                    input_format='csv', output_format='xls',
                                ), format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('output_format', resp.data)

    def test_transformation_requires_source_file(self):
        resp = self.client.post('/api/transformation/packages/create/',
                                self._base_payload(source_file=None), format='json')
        self.assertEqual(resp.status_code, 400)

    def test_transformation_requires_canvas_file(self):
        resp = self.client.post('/api/transformation/packages/create/',
                                self._base_payload(canvas_file=None), format='json')
        self.assertEqual(resp.status_code, 400)

    def test_passthrough_no_source_canvas_ok(self):
        resp = self.client.post('/api/transformation/packages/create/',
                                self._base_payload(
                                    package_type='passthrough',
                                    source_file=None, canvas_file=None,
                                ), format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertIsNone(resp.data['source_file'])
        self.assertIsNone(resp.data['canvas_file'])

    def test_filename_mode_original(self):
        resp = self.client.post('/api/transformation/packages/create/',
                                self._base_payload(
                                    package_type='passthrough',
                                    source_file=None, canvas_file=None,
                                    filename_mode='original',
                                ), format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['filename_mode'], 'original')

    def test_pool_directory_assignment(self):
        from apps.transformation.models import DirectoryRegistry
        pool = DirectoryRegistry.objects.create(
            name='testpool', dir_type='pool', created_by=self.user,
        )
        resp = self.client.post('/api/transformation/packages/create/',
                                self._base_payload(
                                    package_type='passthrough',
                                    source_file=None, canvas_file=None,
                                    pool_directory=pool.id,
                                ), format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['pool_directory'], pool.id)


# ─── Directory Routing Tests ──────────────────────────────────────────

class TestDirectoryRouting(TestCase):
    """Tests for API routing and serializer output of directory-related fields."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='routing', email='routing@example.com', password='Test@12345',
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_list_directories_route(self):
        resp = self.client.get('/api/transformation/directories/')
        self.assertEqual(resp.status_code, 200)

    def test_create_directory_route(self):
        resp = self.client.post('/api/transformation/directories/', {
            'name': 'routetest', 'dir_type': 'delivery',
        })
        self.assertEqual(resp.status_code, 201)

    def test_package_serializer_includes_dir_names(self):
        from apps.transformation.models import DirectoryRegistry
        delivery = DirectoryRegistry.objects.create(
            name='mpower', dir_type='delivery', is_default=True, created_by=self.user,
        )
        source = UploadedFile.objects.create(
            file_type='source', original_filename='s.csv', file_format='csv',
            headers_json=['A'], field_count=1, uploaded_by=self.user,
        )
        canvas = UploadedFile.objects.create(
            file_type='canvas', original_filename='c.csv', file_format='csv',
            headers_json=['X'], field_count=1, uploaded_by=self.user,
        )
        self.client.post('/api/transformation/packages/create/', {
            'name': 'Dir Test', 'file_pattern': '*.csv',
            'package_type': 'transformation',
            'filename_mode': 'prefix',
            'source_file': source.id, 'canvas_file': canvas.id,
            'delivery_directory': delivery.id,
            'input_format': 'csv', 'output_format': 'csv',
            'output_prefix': 'test_', 'batch_mode': 'instant',
        }, format='json')
        resp = self.client.get('/api/transformation/packages/')
        self.assertEqual(resp.status_code, 200)
        pkg = resp.data[0]
        self.assertEqual(pkg['delivery_directory_name'], 'mpower')
        self.assertIn('package_type_display', pkg)

    def test_package_create_with_dirs(self):
        from apps.transformation.models import DirectoryRegistry
        pool = DirectoryRegistry.objects.create(name='bankpool', dir_type='pool', created_by=self.user)
        delivery = DirectoryRegistry.objects.create(name='imatch', dir_type='delivery', created_by=self.user)
        resp = self.client.post('/api/transformation/packages/create/', {
            'name': 'Full Dir Pkg', 'file_pattern': '*.csv',
            'package_type': 'passthrough',
            'filename_mode': 'original',
            'pool_directory': pool.id,
            'delivery_directory': delivery.id,
            'input_format': 'csv', 'output_format': 'csv',
            'output_prefix': '', 'batch_mode': 'instant',
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['pool_directory'], pool.id)
        self.assertEqual(resp.data['delivery_directory'], delivery.id)
        self.assertEqual(resp.data['pool_directory_name'], 'bankpool')
        self.assertEqual(resp.data['delivery_directory_name'], 'imatch')


# ─── File Conversion Pipeline Tests ───────────────────────────────────

@override_settings(
    TRFM_INBOUND_DIR=os.path.join(tempfile.mkdtemp(), 'trfm_inbound'),
    TRFM_OUTBOUND_DIR=os.path.join(tempfile.mkdtemp(), 'trfm_outbound'),
)
class TestFileConversionPipeline(TestCase):
    """Tests that _read_file and _write_file correctly convert between formats."""

    def setUp(self):
        from django.conf import settings
        self.inbound = settings.TRFM_INBOUND_DIR
        self.outbound = settings.TRFM_OUTBOUND_DIR
        os.makedirs(self.inbound, exist_ok=True)
        os.makedirs(self.outbound, exist_ok=True)

    def _create_csv_file(self, name='test.csv'):
        filepath = os.path.join(self.inbound, name)
        with open(filepath, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.writer(f)
            writer.writerow(['Name', 'Amount', 'Date'])
            writer.writerow(['Alice', '1000', '2026-01-01'])
            writer.writerow(['Bob', '2000', '2026-02-15'])
        return filepath

    def _create_xlsx_file(self, name='test.xlsx'):
        filepath = os.path.join(self.inbound, name)
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.append(['Name', 'Amount', 'Date'])
        ws.append(['Charlie', 3000, '2026-03-01'])
        ws.append(['Diana', 4000, '2026-04-10'])
        wb.save(filepath)
        return filepath

    def _create_xls_file(self, name='test.xls'):
        """Create a real .xls file using xlwt."""
        import xlwt
        filepath = os.path.join(self.inbound, name)
        wb = xlwt.Workbook()
        ws = wb.add_sheet('Sheet1')
        headers = ['Name', 'Amount', 'Date']
        for c, h in enumerate(headers):
            ws.write(0, c, h)
        ws.write(1, 0, 'Eve')
        ws.write(1, 1, 5000.0)
        ws.write(1, 2, '2026-05-20')
        ws.write(2, 0, 'Frank')
        ws.write(2, 1, 6000.0)
        ws.write(2, 2, '2026-06-25')
        wb.save(filepath)
        return filepath

    # ── _read_file tests ──

    def test_read_csv_file(self):
        from apps.transformation.tasks import _read_file
        fp = self._create_csv_file()
        data = _read_file(fp, 'test.csv')
        self.assertEqual(len(data), 2)
        self.assertEqual(data[0]['Name'], 'Alice')
        self.assertEqual(data[1]['Amount'], '2000')

    def test_read_xlsx_file(self):
        from apps.transformation.tasks import _read_file
        fp = self._create_xlsx_file()
        data = _read_file(fp, 'test.xlsx')
        self.assertEqual(len(data), 2)
        self.assertEqual(data[0]['Name'], 'Charlie')
        self.assertEqual(data[1]['Amount'], 4000)

    def test_read_xls_file(self):
        from apps.transformation.tasks import _read_file
        fp = self._create_xls_file()
        data = _read_file(fp, 'test.xls')
        self.assertEqual(len(data), 2)
        self.assertEqual(data[0]['Name'], 'Eve')
        self.assertEqual(data[0]['Amount'], 5000.0)
        self.assertEqual(data[1]['Name'], 'Frank')
        self.assertEqual(data[1]['Amount'], 6000.0)

    # ── _write_file tests ──

    def test_write_csv(self):
        from apps.transformation.tasks import _write_file
        out = os.path.join(self.outbound, 'output.csv')
        data = [['Name', 'Value'], ['Test', '100']]
        _write_file(out, data, 'csv')
        self.assertTrue(os.path.exists(out))
        with open(out, 'r', encoding='utf-8-sig') as f:
            reader = csv.reader(f)
            rows = list(reader)
        self.assertEqual(rows[0], ['Name', 'Value'])
        self.assertEqual(rows[1], ['Test', '100'])

    def test_write_xlsx(self):
        from apps.transformation.tasks import _write_file
        out = os.path.join(self.outbound, 'output.xlsx')
        data = [['Name', 'Value'], ['Test', 100]]
        _write_file(out, data, 'xlsx')
        self.assertTrue(os.path.exists(out))
        wb = openpyxl.load_workbook(out)
        ws = wb.active
        self.assertEqual(ws.cell(1, 1).value, 'Name')
        self.assertEqual(ws.cell(2, 2).value, 100)
        wb.close()

    # ── End-to-end conversion path tests ──

    def test_xls_to_csv_conversion(self):
        """XLS → CSV: read XLS, write CSV, verify CSV content."""
        from apps.transformation.tasks import _read_file, _write_file
        fp = self._create_xls_file()
        data = _read_file(fp, 'test.xls')
        headers = list(data[0].keys())
        output_data = [headers] + [[row.get(h, '') for h in headers] for row in data]
        out = os.path.join(self.outbound, 'converted.csv')
        _write_file(out, output_data, 'csv')
        self.assertTrue(os.path.exists(out))
        with open(out, 'r', encoding='utf-8-sig') as f:
            reader = csv.reader(f)
            rows = list(reader)
        self.assertEqual(rows[0], ['Name', 'Amount', 'Date'])
        self.assertEqual(rows[1][0], 'Eve')
        self.assertEqual(len(rows), 3)  # header + 2 data rows

    def test_xls_to_xlsx_conversion(self):
        """XLS → XLSX: read XLS, write XLSX, verify XLSX content."""
        from apps.transformation.tasks import _read_file, _write_file
        fp = self._create_xls_file()
        data = _read_file(fp, 'test.xls')
        headers = list(data[0].keys())
        output_data = [headers] + [[row.get(h, '') for h in headers] for row in data]
        out = os.path.join(self.outbound, 'converted.xlsx')
        _write_file(out, output_data, 'xlsx')
        self.assertTrue(os.path.exists(out))
        wb = openpyxl.load_workbook(out)
        ws = wb.active
        self.assertEqual(ws.cell(1, 1).value, 'Name')
        self.assertEqual(ws.cell(2, 1).value, 'Eve')
        self.assertEqual(ws.cell(3, 1).value, 'Frank')
        wb.close()

    def test_csv_to_xlsx_conversion(self):
        """CSV → XLSX: read CSV, write XLSX, verify XLSX content."""
        from apps.transformation.tasks import _read_file, _write_file
        fp = self._create_csv_file()
        data = _read_file(fp, 'test.csv')
        headers = list(data[0].keys())
        output_data = [headers] + [[row.get(h, '') for h in headers] for row in data]
        out = os.path.join(self.outbound, 'converted.xlsx')
        _write_file(out, output_data, 'xlsx')
        self.assertTrue(os.path.exists(out))
        wb = openpyxl.load_workbook(out)
        ws = wb.active
        self.assertEqual(ws.cell(1, 1).value, 'Name')
        self.assertEqual(ws.cell(2, 1).value, 'Alice')
        wb.close()

    def test_xlsx_to_csv_conversion(self):
        """XLSX → CSV: read XLSX, write CSV, verify CSV content."""
        from apps.transformation.tasks import _read_file, _write_file
        fp = self._create_xlsx_file()
        data = _read_file(fp, 'test.xlsx')
        headers = list(data[0].keys())
        output_data = [headers] + [[row.get(h, '') for h in headers] for row in data]
        out = os.path.join(self.outbound, 'converted.csv')
        _write_file(out, output_data, 'csv')
        self.assertTrue(os.path.exists(out))
        with open(out, 'r', encoding='utf-8-sig') as f:
            reader = csv.reader(f)
            rows = list(reader)
        self.assertEqual(rows[0], ['Name', 'Amount', 'Date'])
        self.assertEqual(rows[1][0], 'Charlie')


# ─── Status Control Enforcement Tests ─────────────────────────────────

class TestStatusControlEnforcement(TestCase):
    """Tests that mapping constraints differ by package_type."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='enforce', email='enforce@example.com', password='Test@12345',
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.source = UploadedFile.objects.create(
            file_type='source', original_filename='s.csv', file_format='csv',
            headers_json=['A', 'B'], field_count=2, uploaded_by=self.user,
        )
        self.canvas = UploadedFile.objects.create(
            file_type='canvas', original_filename='c.csv', file_format='csv',
            headers_json=['X', 'Y'], field_count=2, uploaded_by=self.user,
        )

    def test_transformation_unmapped_cannot_start(self):
        """Transformation package without mappings must be blocked from starting."""
        resp = self.client.post('/api/transformation/packages/create/', {
            'name': 'Blocked Trfm', 'file_pattern': '*.csv',
            'package_type': 'transformation', 'filename_mode': 'prefix',
            'source_file': self.source.id, 'canvas_file': self.canvas.id,
            'input_format': 'csv', 'output_format': 'csv',
            'output_prefix': 'test_', 'batch_mode': 'instant',
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        pkg_id = resp.data['id']
        start_resp = self.client.post(f'/api/transformation/packages/{pkg_id}/start/')
        self.assertEqual(start_resp.status_code, 400)
        self.assertIn('mapped', start_resp.data['error'].lower())

    def test_passthrough_unmapped_can_start(self):
        """Passthrough package can start without mapping."""
        resp = self.client.post('/api/transformation/packages/create/', {
            'name': 'Free Passthrough', 'file_pattern': '*.csv',
            'package_type': 'passthrough', 'filename_mode': 'original',
            'input_format': 'csv', 'output_format': 'csv',
            'batch_mode': 'instant',
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        pkg_id = resp.data['id']
        start_resp = self.client.post(f'/api/transformation/packages/{pkg_id}/start/')
        self.assertEqual(start_resp.status_code, 200)
        self.assertEqual(start_resp.data['status'], 'active')

    def test_convert_unmapped_can_start(self):
        """Convert package can start without mapping."""
        resp = self.client.post('/api/transformation/packages/create/', {
            'name': 'Free Convert', 'file_pattern': '*.xls',
            'package_type': 'convert', 'filename_mode': 'prefix',
            'input_format': 'xls', 'output_format': 'xlsx',
            'output_prefix': 'conv_', 'batch_mode': 'instant',
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        pkg_id = resp.data['id']
        start_resp = self.client.post(f'/api/transformation/packages/{pkg_id}/start/')
        self.assertEqual(start_resp.status_code, 200)
        self.assertEqual(start_resp.data['status'], 'active')

    def test_passthrough_can_adhoc_run(self):
        """Passthrough should not be blocked from ad-hoc run (no matching required)."""
        resp = self.client.post('/api/transformation/packages/create/', {
            'name': 'Adhoc PT', 'file_pattern': '*.csv',
            'package_type': 'passthrough', 'filename_mode': 'original',
            'input_format': 'csv', 'output_format': 'csv',
            'batch_mode': 'instant',
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        pkg_id = resp.data['id']
        # Ad-hoc should NOT return 400 (may return 200 with "no files found")
        adhoc_resp = self.client.post(f'/api/transformation/packages/{pkg_id}/adhoc-run/')
        self.assertNotEqual(adhoc_resp.status_code, 400)

    def test_transformation_unmapped_adhoc_blocked(self):
        """Unmapped transformation package must be blocked from ad-hoc run."""
        resp = self.client.post('/api/transformation/packages/create/', {
            'name': 'Block Adhoc', 'file_pattern': '*.csv',
            'package_type': 'transformation', 'filename_mode': 'prefix',
            'source_file': self.source.id, 'canvas_file': self.canvas.id,
            'input_format': 'csv', 'output_format': 'csv',
            'output_prefix': 'test_', 'batch_mode': 'instant',
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        pkg_id = resp.data['id']
        adhoc_resp = self.client.post(f'/api/transformation/packages/{pkg_id}/adhoc-run/')
        self.assertEqual(adhoc_resp.status_code, 400)

    def test_edit_guard_active_package(self):
        """Active passthrough package should block edit (via frontend guard — test status field)."""
        from apps.transformation.models import Package
        resp = self.client.post('/api/transformation/packages/create/', {
            'name': 'Guard Test', 'file_pattern': '*.csv',
            'package_type': 'passthrough', 'filename_mode': 'original',
            'input_format': 'csv', 'output_format': 'csv',
            'batch_mode': 'instant',
        }, format='json')
        pkg_id = resp.data['id']
        self.client.post(f'/api/transformation/packages/{pkg_id}/start/')
        detail = self.client.get(f'/api/transformation/packages/{pkg_id}/')
        self.assertEqual(detail.data['status'], 'active')
