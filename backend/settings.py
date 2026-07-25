import os
from pathlib import Path
from datetime import timedelta
from decouple import config, Csv, Config, RepositoryEnv

BASE_DIR = Path(__file__).resolve().parent.parent

# Determine environment
DJANGO_ENV = os.environ.get('DJANGO_ENV', 'development')

# Load from .env file based on environment
if DJANGO_ENV == 'production':
    env_file = '.env.production'
else:
    env_file = '.env'

# Create config object with the correct env file
env = Config(RepositoryEnv(os.path.join(BASE_DIR, env_file)))

# Load from .env
SECRET_KEY = env('SECRET_KEY')
DEBUG = env('DEBUG', default=False, cast=bool)
ALLOWED_HOSTS = env('ALLOWED_HOSTS', default='localhost,127.0.0.1,yourdomain.com', cast=Csv())
INTERNAL_API_SECRET = env('INTERNAL_API_SECRET')

REDIS_PASSWORD = env('REDIS_PASSWORD', default='')

# --- 0. Feature Flags ---
SPORTS_MODULE_ENABLED = env('SPORTS_MODULE_ENABLED', default=False, cast=bool)


# --- 1. Applications ---
INSTALLED_APPS = [
    'daphne',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third-party for API & Auth
    'rest_framework',
    'corsheaders',
    'rest_framework_simplejwt',
    'channels',

    # Your app
    'members',
    # AI Assistant models (defined in members/ai_models.py, but registered here)
]

# --- 2. Middleware ---
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'backend.middleware.AdminIPWhitelistMiddleware',  # Custom IP protection
]

ROOT_URLCONF = 'backend.urls'
WSGI_APPLICATION = 'backend.wsgi.application'
ASGI_APPLICATION = 'backend.asgi.application'

# --- 3. Templates (REQUIRED for Admin) ---
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR, 'members/templates')],
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

# --- 4. Database ---
import dj_database_url

# Use DATABASE_URL from environment, fallback to SQLite for development
DATABASE_URL = env('DATABASE_URL', default='')
if DATABASE_URL:
    DATABASES = {
        'default': dj_database_url.config(default=DATABASE_URL, conn_max_age=600)
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# --- 5. CORS & JWT Settings ---
CORS_ALLOWED_ORIGINS = [
    "https://yourdomain.com",
    "https://www.yourdomain.com",
    "https://vdo.yourdomain.com",
    "https://live.yourdomain.com",
    "https://api.yourdomain.com",
    "http://127.0.0.1:8000",
    "http://127.0.0.1:8001",
    "http://localhost:3000",
    "http://localhost:3001",
]
CORS_ALLOW_CREDENTIALS = True

# Explicit CORS headers — critical for JWT Bearer token auth
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',       # ← Required for JWT Bearer tokens
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ),
    'DEFAULT_THROTTLE_CLASSES': [
        'backend.throttles.ExemptLocalhostAnonThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '30/hour',
        'user': '1000/hour',
    },
}

# JWT Configuration — used by djangorestframework_simplejwt
# Both session auth (Django admin) and JWT auth (Next.js API) are supported
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,
    'AUDIENCE': None,
    'ISSUER': None,
    
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
    
    'JTI_CLAIM': 'jti',
}
# --- 6. Cloudflare Turnstile (CAPTCHA alternative) ---
TURNSTILE_SITE_KEY = env('TURNSTILE_SITE_KEY', default='0x4AAAAAADPOeVlfh0kjl81_')  # Always passes in test mode
TURNSTILE_SECRET_KEY = env('TURNSTILE_SECRET_KEY', default='0x4AAAAAADPOeX6k-JGQQPnNdO6dVsT-dnQ')  # Always passes in test mode

# --- 7. Frontend URL for verification emails ---
FRONTEND_URL = env('FRONTEND_URL', default='https://yourdomain.com')

# --- 7. Owncast Configuration ---
OWNCAST_URL = env('OWNCAST_URL', default='https://live.yourdomain.com')

# --- 9. File Upload & Media Settings ---
FILE_UPLOAD_HANDLERS = [
    'django.core.files.uploadhandler.TemporaryFileUploadHandler',
]

DATA_UPLOAD_MAX_MEMORY_SIZE = 104857600  # 100MB
FILE_UPLOAD_MAX_MEMORY_SIZE = 104857600  # 100MB

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Static files
STATIC_URL = 'static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'static')

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

CSRF_TRUSTED_ORIGINS = [
    "https://yourdomain.com",
    "https://www.yourdomain.com",
    "https://api.yourdomain.com",
    "https://vdo.yourdomain.com",
    "https://turn.yourdomain.com",
    "https://live.yourdomain.com",
]  

SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# --- 10. Admin Security ---
ADMIN_URL = env('ADMIN_URL', default='admin-hq2024')
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True

# IP Whitelist for Admin (comma-separated in .env)
ADMIN_IP_WHITELIST = env('ADMIN_IP_WHITELIST', default='', cast=Csv())

# Ensure cookies are only sent over HTTPS
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True
# --- 10.5 AI Assistant — DeepSeek API Keys ---
DEEPSEEK_API_COACH = env('DeepSeek_API_COACH', default='')
DEEPSEEK_API_ATHLETE = env('DeepSeek_API_ATHLETE', default='')

# --- 11. Channels Configuration for WebRTC ---
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            "hosts": [f"redis://:{REDIS_PASSWORD}@127.0.0.1:6379/0"] if REDIS_PASSWORD else ["redis://127.0.0.1:6379/0"],
        },
    },
}

# --- LiveKit Section (FIXED SYNTAX) ---
LIVEKIT_API_KEY = env('LIVEKIT_API_KEY')
LIVEKIT_API_SECRET = env('LIVEKIT_API_SECRET')
LIVEKIT_URL = env('LIVEKIT_URL')
LIVEKIT_ROOM_NAME = env('LIVEKIT_ROOM_NAME', default='Broadcast_Studio_A1')
LIVEKIT_API_URL= env('LIVEKIT_API_URL')

# --- 14. RTMP Configuration ---
RTMP_SERVER_URL = env('RTMP_SERVER_URL', default='rtmp://live.yourdomain.com:1936')
RTMP_INGEST_APPLICATION = env('RTMP_INGEST_APPLICATION', default='ingest')
RTMP_LIVE_APPLICATION = env('RTMP_LIVE_APPLICATION', default='live')
RTMP_GUEST_STREAM_PREFIX = env('RTMP_GUEST_STREAM_PREFIX', default='guest_')
RTMP_OBS_STREAM_NAME = env('RTMP_OBS_STREAM_NAME', default='obs')
RTMP_COMPOSED_STREAM_NAME = env('RTMP_COMPOSED_STREAM_NAME', default='composed')

# --- 15. Streaming Platform envuration ---
STREAMING_PLATFORMS_ENABLED = env('STREAMING_PLATFORMS_ENABLED', default=True, cast=bool)
STREAMING_MULTICAST_ENABLED = env('STREAMING_MULTICAST_ENABLED', default=True, cast=bool)
STREAMING_OWNCAST_ENABLED = env('STREAMING_OWNCAST_ENABLED', default=True, cast=bool)
STREAMING_OWNCAST_RTMP_URL = env('STREAMING_OWNCAST_RTMP_URL', default='rtmp://live.yourdomain.com/live')

# Social Media Platform Defaults
YOUTUBE_RTMP_URL = env('YOUTUBE_RTMP_URL', default='rtmp://a.rtmp.youtube.com/live2')
FACEBOOK_RTMP_URL = env('FACEBOOK_RTMP_URL', default='rtmp://live-api-s.facebook.com:80/rtmp')
TIKTOK_RTMP_URL = env('TIKTOK_RTMP_URL', default='rtmp://live.tiktok.com/live')

# --- 16. Email Configuration ---
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = env('EMAIL_HOST', default='mail.yourdomain.com')
EMAIL_PORT = 587
EMAIL_USE_TLS = True
# Important: Ensure EMAIL_USE_SSL is False if using TLS/Port 587
EMAIL_USE_SSL = False 

EMAIL_HOST_USER = env('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD', default='')

DEFAULT_FROM_EMAIL = env('DEFAULT_FROM_EMAIL', default='support@yourdomain.com')
SERVER_EMAIL = DEFAULT_FROM_EMAIL

# --- 17. FFmpeg Composition envuration ---
FFMPEG_COMPOSITION_ENABLED = env('FFMPEG_COMPOSITION_ENABLED', default=True, cast=bool)
FFMPEG_PORTRAIT_WIDTH = env('FFMPEG_PORTRAIT_WIDTH', default=1080, cast=int)
FFMPEG_PORTRAIT_HEIGHT = env('FFMPEG_PORTRAIT_HEIGHT', default=1920, cast=int)
FFMPEG_GUEST_OVERLAY_WIDTH = env('FFMPEG_GUEST_OVERLAY_WIDTH', default=540, cast=int)
FFMPEG_GUEST_OVERLAY_HEIGHT = env('FFMPEG_GUEST_OVERLAY_HEIGHT', default=960, cast=int)
FFMPEG_GUEST_OVERLAY_X = env('FFMPEG_GUEST_OVERLAY_X', default=20, cast=int)
FFMPEG_GUEST_OVERLAY_Y = env('FFMPEG_GUEST_OVERLAY_Y', default=100, cast=int)
