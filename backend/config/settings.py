"""
Django settings for ETL Platform project.
"""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# ===== Security =====
SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-dev-key')
DEBUG = os.environ.get('DEBUG', 'True').lower() in ('true', '1', 'yes')

ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

# ===== Application Definition =====
INSTALLED_APPS = [
    # Unfold admin theme (must be before django.contrib.admin)
    'unfold',
    'unfold.contrib.filters',
    'unfold.contrib.forms',

    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third party
    'rest_framework',
    'corsheaders',
    'oauth2_provider',
    'django_celery_beat',

    # Local apps
    'apps.accounts',
    'apps.dashboard',
    'apps.transformation',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# ===== Database =====
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('POSTGRES_DB', 'etl_platform'),
        'USER': os.environ.get('POSTGRES_USER', 'etl_user'),
        'PASSWORD': os.environ.get('POSTGRES_PASSWORD', 'etl_password'),
        'HOST': os.environ.get('POSTGRES_HOST', 'db'),
        'PORT': os.environ.get('POSTGRES_PORT', '5432'),
    }
}

# ===== Auth =====
AUTH_USER_MODEL = 'accounts.User'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
     'OPTIONS': {'min_length': 10}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ===== REST Framework =====
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'oauth2_provider.contrib.rest_framework.OAuth2Authentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_RENDERER_CLASSES': (
        'rest_framework.renderers.JSONRenderer',
    ),
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '20/minute',
        'user': '100/minute',
        'login': '5/minute',
    },
}

# ===== OAuth2 (Django OAuth Toolkit) =====
OAUTH2_PROVIDER = {
    'SCOPES': {
        'read': 'Read scope',
        'write': 'Write scope',
    },
    'ACCESS_TOKEN_EXPIRE_SECONDS': 3600,       # 1 hour
    'REFRESH_TOKEN_EXPIRE_SECONDS': 86400,      # 24 hours
    'ROTATE_REFRESH_TOKEN': True,
}

LOGIN_URL = '/admin/login/'

# ===== CORS =====
CORS_ALLOWED_ORIGINS = os.environ.get(
    'CORS_ALLOWED_ORIGINS', 'http://localhost:3000'
).split(',')
CORS_ALLOW_CREDENTIALS = True

# ===== Email (Mailpit) =====
EMAIL_BACKEND = os.environ.get(
    'EMAIL_BACKEND', 'django.core.mail.backends.smtp.EmailBackend'
)
EMAIL_HOST = os.environ.get('MAIL_HOST', 'mailpit')
EMAIL_PORT = int(os.environ.get('MAIL_PORT', 1025))
EMAIL_USE_TLS = False
DEFAULT_FROM_EMAIL = 'noreply@etlplatform.local'

# ===== Internationalization =====
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kuala_Lumpur'
USE_I18N = True
USE_TZ = True

# ===== Static Files =====
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# ===== Media Files (Uploads) =====
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ===== Unfold Admin =====
UNFOLD = {
    "SITE_TITLE": "ETL Platform Admin",
    "SITE_HEADER": "ETL Platform",
    "SITE_SYMBOL": "database",
    "SHOW_HISTORY": True,
    "SHOW_VIEW_ON_SITE": False,
    "THEME": "dark",
    "STYLES": [
        lambda request: "admin/css/bloomberg.css",
    ],
    "COLORS": {
        "primary": {
            "50": "255 243 224",
            "100": "255 224 178",
            "200": "255 204 128",
            "300": "255 183 77",
            "400": "255 167 38",
            "500": "255 152 0",
            "600": "251 140 0",
            "700": "245 124 0",
            "800": "230 81 0",
            "900": "191 54 12",
            "950": "120 30 5",
        },
    },
    "SIDEBAR": {
        "show_search": True,
        "show_all_applications": False,
        "navigation": [
            {
                "title": "Dashboard",
                "icon": "dashboard",
                "items": [
                    {
                        "title": "Home",
                        "icon": "home",
                        "link": "/admin/",
                    },
                ],
            },
            {
                "title": "Transformation",
                "icon": "transform",
                "items": [
                    {
                        "title": "Packages",
                        "icon": "inventory_2",
                        "link": "/admin/transformation/package/",
                    },
                    {
                        "title": "Uploaded Files",
                        "icon": "upload_file",
                        "link": "/admin/transformation/uploadedfile/",
                    },
                    {
                        "title": "Inbound File Logs",
                        "icon": "receipt_long",
                        "link": "/admin/transformation/inboundfilelog/",
                    },
                ],
            },
            {
                "title": "File Manager",
                "icon": "folder_open",
                "items": [
                    {
                        "title": "File Tags",
                        "icon": "tag",
                        "link": "/admin/transformation/filetag/",
                    },
                ],
            },
            {
                "title": "Users & Permissions",
                "icon": "admin_panel_settings",
                "items": [
                    {
                        "title": "Users",
                        "icon": "person",
                        "link": "/admin/accounts/user/",
                    },
                    {
                        "title": "Groups",
                        "icon": "group",
                        "link": "/admin/auth/group/",
                    },
                ],
            },
            {
                "title": "Documentation",
                "icon": "menu_book",
                "items": [
                    {
                        "title": "API Documentation",
                        "icon": "api",
                        "link": "/admin/api-docs/",
                    },
                ],
            },
        ],
    },
}

# ===== Security Headers =====
if not DEBUG:
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    X_FRAME_OPTIONS = 'DENY'
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

# ===== Celery (Redis) =====
CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', 'redis://redis:6379/0')
CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', 'redis://redis:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE
CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'

# ===== File Processing Paths =====
TRFM_INBOUND_DIR = os.environ.get('TRFM_INBOUND_DIR', '/data/trfm_inbound')
TRFM_OUTBOUND_DIR = os.environ.get('TRFM_OUTBOUND_DIR', '/data/trfm_outbound')
