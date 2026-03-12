import os
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient
from oauth2_provider.models import Application, AccessToken, RefreshToken
from oauthlib.common import generate_token
from django.utils import timezone
from datetime import timedelta

from apps.accounts.models import User


@override_settings(
    REST_FRAMEWORK={
        'DEFAULT_AUTHENTICATION_CLASSES': (
            'oauth2_provider.contrib.rest_framework.OAuth2Authentication',
        ),
        'DEFAULT_PERMISSION_CLASSES': (
            'rest_framework.permissions.IsAuthenticated',
        ),
        'DEFAULT_THROTTLE_CLASSES': [],
        'DEFAULT_THROTTLE_RATES': {},
    }
)
class AuthTestCase(TestCase):
    """Base test case with OAuth2 setup."""

    def setUp(self):
        self.client = APIClient()
        self.app = Application.objects.create(
            client_id='test-client-id',
            client_secret='test-client-secret',
            client_type=Application.CLIENT_CONFIDENTIAL,
            authorization_grant_type=Application.GRANT_PASSWORD,
            name='Test App',
        )
        # Set environment variable for OAuth2 client
        os.environ['OAUTH2_CLIENT_ID'] = 'test-client-id'

        self.user = User.objects.create_user(
            email='testuser@example.com',
            username='testuser',
            password='TestP@ssw0rd!',
            first_name='Test',
            last_name='User',
            role=User.Role.USER,
        )

    def get_auth_token(self, user=None):
        """Helper to create an access token for a user."""
        user = user or self.user
        token = AccessToken.objects.create(
            user=user,
            application=self.app,
            token=generate_token(),
            expires=timezone.now() + timedelta(hours=1),
            scope='read write',
        )
        return token.token

    def auth_client(self, user=None):
        """Return an authenticated API client."""
        token = self.get_auth_token(user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        return self.client


class UserModelTests(AuthTestCase):
    """Tests for the custom User model."""

    def test_create_user(self):
        self.assertEqual(self.user.email, 'testuser@example.com')
        self.assertEqual(self.user.role, User.Role.USER)
        self.assertTrue(self.user.check_password('TestP@ssw0rd!'))

    def test_user_str(self):
        self.assertIn('testuser@example.com', str(self.user))

    def test_is_admin_property(self):
        self.assertFalse(self.user.is_admin)
        self.user.role = User.Role.ADMIN
        self.assertTrue(self.user.is_admin)

    def test_is_superadmin_property(self):
        self.assertFalse(self.user.is_superadmin)
        self.user.role = User.Role.SUPERADMIN
        self.assertTrue(self.user.is_superadmin)

    def test_failed_login_attempts_lockout(self):
        for _ in range(5):
            self.user.increment_failed_attempts()
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_locked)
        self.assertGreaterEqual(self.user.failed_login_attempts, 4)

    def test_reset_failed_attempts(self):
        self.user.failed_login_attempts = 3
        self.user.save()
        self.user.reset_failed_attempts()
        self.user.refresh_from_db()
        self.assertEqual(self.user.failed_login_attempts, 0)
        self.assertIsNone(self.user.locked_until)


class LoginViewTests(AuthTestCase):
    """Tests for the login API endpoint."""

    def test_login_success(self):
        response = self.client.post('/api/auth/login/', {
            'email': 'testuser@example.com',
            'password': 'TestP@ssw0rd!',
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('access_token', data)
        self.assertIn('refresh_token', data)
        self.assertEqual(data['token_type'], 'Bearer')
        self.assertIn('user', data)
        self.assertEqual(data['user']['email'], 'testuser@example.com')

    def test_login_invalid_credentials(self):
        response = self.client.post('/api/auth/login/', {
            'email': 'testuser@example.com',
            'password': 'wrongpassword',
        })
        self.assertEqual(response.status_code, 400)

    def test_login_nonexistent_user(self):
        response = self.client.post('/api/auth/login/', {
            'email': 'nobody@example.com',
            'password': 'whatever',
        })
        self.assertEqual(response.status_code, 400)

    def test_login_locked_account(self):
        self.user.failed_login_attempts = 5
        self.user.locked_until = timezone.now() + timedelta(minutes=30)
        self.user.save()

        response = self.client.post('/api/auth/login/', {
            'email': 'testuser@example.com',
            'password': 'TestP@ssw0rd!',
        })
        self.assertEqual(response.status_code, 400)

    def test_login_inactive_user(self):
        self.user.is_active = False
        self.user.save()
        response = self.client.post('/api/auth/login/', {
            'email': 'testuser@example.com',
            'password': 'TestP@ssw0rd!',
        })
        self.assertEqual(response.status_code, 400)


class TokenRefreshTests(AuthTestCase):
    """Tests for the token refresh endpoint."""

    def test_refresh_token_success(self):
        # Create tokens directly
        access_token = AccessToken.objects.create(
            user=self.user,
            application=self.app,
            token=generate_token(),
            expires=timezone.now() + timedelta(hours=1),
            scope='read write',
        )
        refresh = RefreshToken.objects.create(
            user=self.user,
            application=self.app,
            token=generate_token(),
            access_token=access_token,
        )

        # Use refresh token
        response = self.client.post('/api/auth/refresh/', {
            'refresh_token': refresh.token,
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('access_token', data)
        self.assertIn('refresh_token', data)

    def test_refresh_token_invalid(self):
        response = self.client.post('/api/auth/refresh/', {
            'refresh_token': 'invalid-token',
        })
        self.assertEqual(response.status_code, 401)

    def test_refresh_token_missing(self):
        response = self.client.post('/api/auth/refresh/', {})
        self.assertEqual(response.status_code, 400)


class ProtectedEndpointTests(AuthTestCase):
    """Tests for protected API endpoints."""

    def test_me_authenticated(self):
        client = self.auth_client()
        response = client.get('/api/auth/me/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['email'], 'testuser@example.com')
        self.assertEqual(data['role'], 'user')

    def test_me_unauthenticated(self):
        response = self.client.get('/api/auth/me/')
        self.assertEqual(response.status_code, 401)

    def test_logout(self):
        client = self.auth_client()
        response = client.post('/api/auth/logout/')
        self.assertEqual(response.status_code, 200)

    def test_dashboard_authenticated(self):
        client = self.auth_client()
        response = client.get('/api/dashboard/summary/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('welcome_message', data)
        self.assertIn('stats', data)

    def test_dashboard_unauthenticated(self):
        response = self.client.get('/api/dashboard/summary/')
        self.assertEqual(response.status_code, 401)

    def test_update_profile(self):
        client = self.auth_client()
        response = client.patch('/api/auth/me/update/', {
            'first_name': 'Updated',
        })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['first_name'], 'Updated')
