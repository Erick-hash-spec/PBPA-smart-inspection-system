import os
import logging
from pathlib import Path
from datetime import timedelta

try:
    import dj_database_url
except ImportError:
    dj_database_url = None

BASE_DIR = Path(__file__).resolve().parent.parent

def load_env_file(path):
    if not path.exists():
        return
    for raw_line in path.read_text(encoding='utf-8').splitlines():
        line = raw_line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        key, value = line.split('=', 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)

load_env_file(BASE_DIR / '.env')

def env_bool(name, default=False):
    return os.environ.get(name, str(default)).lower() in {'1', 'true', 'yes', 'on'}

def env_list(name, default=''):
    return [item.strip() for item in os.environ.get(name, default).split(',') if item.strip()]

# ── Core ──────────────────────────────────────────────────────────────────────
SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-pbpa-dev-key-change-in-production-2024')
DEBUG      = env_bool('DEBUG', True)
ALLOWED_HOSTS = env_list('ALLOWED_HOSTS', '*')

# AES-256-GCM key for application data encrypted at rest. Production must use
# a random base64url-encoded 32-byte value. The derived development key keeps
# local databases usable but is never permitted when DEBUG is disabled.
AES_256_GCM_KEY = os.environ.get('AES_256_GCM_KEY', '')
if not AES_256_GCM_KEY and DEBUG:
    import base64
    import hashlib
    AES_256_GCM_KEY = base64.urlsafe_b64encode(
        hashlib.sha256(f'{SECRET_KEY}:aes-256-gcm-development-only'.encode()).digest()
    ).decode().rstrip('=')
elif not AES_256_GCM_KEY:
    raise RuntimeError('AES_256_GCM_KEY is required when DEBUG=False.')

FRONTEND_HOST = os.environ.get('FRONTEND_HOST', '')
BACKEND_HOST  = os.environ.get('BACKEND_HOST', '')
FRONTEND_URL  = os.environ.get(
    'FRONTEND_URL',
    f'https://{FRONTEND_HOST}' if FRONTEND_HOST else ('http://localhost:3000' if DEBUG else ''),
)
# Public base URL encoded into PDF QR codes.  For LAN testing set this to the
# computer's Wi-Fi address, e.g. http://192.168.1.105:8000.  Leaving it blank
# uses the host that generated the PDF.
QR_VERIFICATION_BASE_URL = os.environ.get('QR_VERIFICATION_BASE_URL', '').rstrip('/')

# Email delivery for signing requests.  Configure SMTP_EMAIL_* in deployment;
# the console backend keeps local development and tests self-contained.
EMAIL_BACKEND = os.environ.get(
    'EMAIL_BACKEND',
    'django.core.mail.backends.console.EmailBackend' if DEBUG else 'django.core.mail.backends.smtp.EmailBackend',
)
EMAIL_HOST = os.environ.get('SMTP_EMAIL_HOST', '')
EMAIL_PORT = int(os.environ.get('SMTP_EMAIL_PORT', '587'))
EMAIL_HOST_USER = os.environ.get('SMTP_EMAIL_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('SMTP_EMAIL_PASSWORD', '')
EMAIL_USE_TLS = env_bool('SMTP_EMAIL_USE_TLS', True)
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'no-reply@pbpa.local')

CSRF_TRUSTED_ORIGINS = env_list('CSRF_TRUSTED_ORIGINS')
for _host in (FRONTEND_HOST, BACKEND_HOST):
    if _host:
        CSRF_TRUSTED_ORIGINS.append(f'https://{_host}')

# ── Security headers (enforced in production) ─────────────────────────────────
if not DEBUG:
    # HTTPS & Transport Security
    SECURE_BROWSER_XSS_FILTER      = True
    SECURE_CONTENT_TYPE_NOSNIFF    = True
    SECURE_HSTS_SECONDS            = 31536000   # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD            = True
    SECURE_SSL_REDIRECT            = True
    
    # Cookie Security
    SESSION_COOKIE_SECURE          = True
    SESSION_COOKIE_HTTPONLY        = True
    SESSION_COOKIE_SAMESITE        = 'Strict'
    SESSION_COOKIE_AGE             = 3600  # 1 hour
    SESSION_COOKIE_NAME            = '__Host-sessionid'
    
    CSRF_COOKIE_SECURE             = True
    CSRF_COOKIE_HTTPONLY           = True
    CSRF_COOKIE_SAMESITE           = 'Strict'
    CSRF_COOKIE_NAME               = '__Host-csrftoken'
    
    # Framing & Embedding
    X_FRAME_OPTIONS                = 'DENY'
    SECURE_REFERRER_POLICY         = 'strict-origin-when-cross-origin'
    SECURE_PERMISSIONS_POLICY      = 'geolocation=(), microphone=(), camera=(), payment=()'
    
    # Additional Security Headers
    SECURE_CONTENT_SECURITY_POLICY = {
        'default-src': ("'self'",),
        'script-src': ("'self'", "'unsafe-inline'"),  # TODO: Remove unsafe-inline and use nonces
        'style-src': ("'self'", "'unsafe-inline'"),   # TODO: Move to external stylesheets
        'img-src': ("'self'", 'data:', 'https:'),
        'font-src': ("'self'",),
        'connect-src': ("'self'", "https://*.onrender.com"),
        'frame-ancestors': ("'none'",),
        'base-uri': ("'self'",),
        'form-action': ("'self'",),
    }
    
    # Verify SECRET_KEY is not the default in production
    if 'insecure' in SECRET_KEY or 'change-me' in SECRET_KEY:
        import warnings
        warnings.warn(
            'WARNING: SECRET_KEY appears to be insecure. Set a strong SECRET_KEY env variable in production.',
            stacklevel=2
        )
else:
    # Development settings
    X_FRAME_OPTIONS                = 'SAMEORIGIN'
    SECURE_REFERRER_POLICY         = 'same-origin'
    SECURE_PERMISSIONS_POLICY      = 'geolocation=(), microphone=(), camera=(), payment=()'

# ── Installed apps ────────────────────────────────────────────────────────────
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third-party
    'rest_framework',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    # Local
    'inspections.apps.InspectionsConfig',
]

# ── Middleware ────────────────────────────────────────────────────────────────
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'inspections.middleware.SecurityHeadersMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'config.context_processors.deployment_urls',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# ── Database ──────────────────────────────────────────────────────────────────
if dj_database_url:
    DATABASES = {
        'default': dj_database_url.config(
            default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}",
            conn_max_age=600,
            conn_health_checks=True,
        )
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
    if os.environ.get('DATABASE_URL'):
        raise ImportError('dj-database-url is required when DATABASE_URL is set.')

# ── Password validation ───────────────────────────────────────────────────────
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
     'OPTIONS': {'min_length': 8}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Argon2id is deliberately first so passwords are upgraded on their next login.
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.Argon2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher',
]

# MFA is deliberately off during local development. Enable it only after the
# deployed environment is ready and privileged users have enrolled.
MFA_ENABLED = env_bool('MFA_ENABLED', False)
# Set MFA_REQUIRED_ROLES=admin (or a comma-separated role list) after the
# affected users have enrolled, to avoid locking out an administrator.
MFA_REQUIRED_ROLES = set(env_list('MFA_REQUIRED_ROLES', ''))

# ── Internationalisation ──────────────────────────────────────────────────────
LANGUAGE_CODE = 'en-us'
TIME_ZONE     = 'UTC'
USE_I18N      = True
USE_TZ        = True

# ── Static / Media ────────────────────────────────────────────────────────────
STATIC_URL  = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
MEDIA_URL   = '/media/'
MEDIA_ROOT  = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ── Django REST Framework ─────────────────────────────────────────────────────
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'MAX_PAGE_SIZE': 1000,  # Prevent excessive data requests
    'DEFAULT_FILTER_BACKENDS': [
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    # Rate limiting — brute-force & abuse protection
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '30/minute',
        'user': '300/minute',
        'login': '5/minute',   # Stricter login rate limiting
        'register': '3/hour',  # Prevent registration spam
    },
    # Only expose JSON — no browsable API in production
    'DEFAULT_RENDERER_CLASSES': (
        ['rest_framework.renderers.JSONRenderer', 'rest_framework.renderers.BrowsableAPIRenderer']
        if DEBUG else
        ['rest_framework.renderers.JSONRenderer']
    ),
    # Security settings
    'DEFAULT_VERSIONING_CLASS': 'rest_framework.versioning.AcceptHeaderVersioning',
    'EXCEPTION_HANDLER': 'rest_framework.views.exception_handler',
}

# ── JWT ───────────────────────────────────────────────────────────────────────
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME':    timedelta(hours=1) if DEBUG else timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME':   timedelta(days=7),
    'ROTATE_REFRESH_TOKENS':    True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN':        True,
    'ALGORITHM':                'HS256',
    'AUTH_HEADER_TYPES':        ('Bearer',),
    'AUTH_TOKEN_CLASSES':       ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM':         'token_type',
}

# ── CORS ──────────────────────────────────────────────────────────────────────
CORS_ALLOWED_ORIGINS = env_list(
    'CORS_ALLOWED_ORIGINS',
    'http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000,http://127.0.0.1:8000',
)
if FRONTEND_URL and FRONTEND_URL not in CORS_ALLOWED_ORIGINS:
    CORS_ALLOWED_ORIGINS.append(FRONTEND_URL)

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = False   # never wildcard
CORS_ALLOWED_METHODS   = ['DELETE', 'GET', 'OPTIONS', 'PATCH', 'POST', 'PUT']
CORS_ALLOWED_HEADERS   = [
    'accept', 'accept-encoding', 'authorization',
    'content-type', 'dnt', 'origin', 'user-agent',
    'x-csrftoken', 'x-requested-with',
]

# ── Logging ───────────────────────────────────────────────────────────────────
LOG_DIR = BASE_DIR / 'logs'
LOG_DIR.mkdir(exist_ok=True)

# Try to import JSON logger for structured logging
try:
    import pythonjsonlogger
    HAS_JSON_LOGGER = True
except ImportError:
    HAS_JSON_LOGGER = False

# Logging configuration
LOGGING_FORMATTERS = {
    'verbose': {
        'format': '{levelname} {asctime} {module} {message}',
        'style': '{',
    },
}

# Add JSON formatter if available
if HAS_JSON_LOGGER:
    LOGGING_FORMATTERS['json'] = {
        '()': 'pythonjsonlogger.jsonlogger.JsonFormatter',
        'format': '%(asctime)s %(name)s %(levelname)s %(message)s',
    }

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': LOGGING_FORMATTERS,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
        'security_file': {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': LOG_DIR / 'security.log',
            'maxBytes': 10485760,  # 10MB
            'backupCount': 10,
            'formatter': 'verbose',
        },
        'audit_file': {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': LOG_DIR / 'audit.log',
            'maxBytes': 10485760,  # 10MB
            'backupCount': 10,
            'formatter': 'json' if HAS_JSON_LOGGER else 'verbose',
        },
        'error_file': {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': LOG_DIR / 'error.log',
            'maxBytes': 10485760,  # 10MB
            'backupCount': 10,
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'django.security': {
            'handlers': ['console', 'security_file'],
            'level': 'WARNING',
            'propagate': False,
        },
        'inspections.security': {
            'handlers': ['console', 'security_file'],
            'level': 'INFO',
            'propagate': False,
        },
        'inspections.audit': {
            'handlers': ['audit_file'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.db.backends': {
            'handlers': ['console'] if DEBUG else [],
            'level': 'DEBUG' if DEBUG else 'INFO',
            'propagate': False,
        },
    },
    'root': {
        'handlers': ['console', 'error_file'],
        'level': 'INFO',
    },
}

if DEBUG:
    LOGGING['handlers']['file'] = {
        'class': 'logging.FileHandler',
        'filename': LOG_DIR / 'debug.log',
        'formatter': 'verbose',
    }
    LOGGING['root']['handlers'].append('file')


# ── Additional Security Settings ──────────────────────────────────────────────
# Input validation and file upload restrictions
DATA_UPLOAD_MAX_MEMORY_SIZE = 2621440  # 2.5 MB
FILE_UPLOAD_MAX_MEMORY_SIZE = 2621440  # 2.5 MB
FILE_UPLOAD_PERMISSIONS = 0o644
FILE_UPLOAD_TEMP_DIR = BASE_DIR / 'temp_uploads'
ALLOWED_UPLOAD_EXTENSIONS = ['pdf', 'xlsx', 'csv', 'jpg', 'jpeg', 'png']

# Session security
SESSION_ENGINE = 'django.contrib.sessions.backends.db'
SESSION_EXPIRE_AT_BROWSER_CLOSE = True
SESSION_SAVE_EVERY_REQUEST = True  # Update session expiry on every request

# Password security
PASSWORD_RESET_TIMEOUT = 3600  # 1 hour
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
     'OPTIONS': {'min_length': 12}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Security-related configuration variables
CSRF_FAILURE_VIEW = 'inspections.views.csrf_failure'
