"""Isolated, per-store desktop database. Never imports the deployment .env."""
import os
from pathlib import Path

os.environ["DJANGO_SECRET_KEY"] = os.environ["ILBI_DESKTOP_SECRET"]
os.environ["DJANGO_DEBUG"] = "False"
os.environ["LOCAL_DEMO_LOGIN_ENABLED"] = "False"
os.environ["USE_MINIO"] = "False"
os.environ["ALLOWED_HOSTS"] = "127.0.0.1,localhost"

from .settings import *  # noqa: E402,F403

DESKTOP_MODE = True
DESKTOP_DATA_DIR = Path(os.environ["ILBI_DESKTOP_DATA"])
DESKTOP_BRIDGE_KEY = os.environ["ILBI_DESKTOP_BRIDGE_KEY"]
DESKTOP_SERVER = os.environ.get("ILBI_DESKTOP_SERVER", "https://ilbi.uz")
DATABASES = {"default": {"ENGINE": "django.db.backends.postgresql", "NAME": "ilbi_desktop",
                          "USER": "ilbi_desktop", "PASSWORD": os.environ["ILBI_DESKTOP_DB_PASSWORD"],
                          "HOST": "127.0.0.1", "PORT": os.environ["ILBI_DESKTOP_DB_PORT"]}}
MEDIA_ROOT = DESKTOP_DATA_DIR / "media"
STATIC_ROOT = DESKTOP_DATA_DIR / "static"
CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"},
          "support": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
REST_FRAMEWORK = {**REST_FRAMEWORK, "DEFAULT_AUTHENTICATION_CLASSES": ("apps.desktop_sync.authentication.DesktopJWTAuthentication",)}
MIDDLEWARE = ["apps.desktop_sync.middleware.DesktopMiddleware", *MIDDLEWARE]
CELERY_BROKER_URL = "memory://"
CELERY_RESULT_BACKEND = "cache+memory://"
EMAIL_BACKEND = "django.core.mail.backends.dummy.EmailBackend"
INTERNAL_SERVICE_TOKEN = None
TELEGRAM_BOT_TOKEN = None
ROOT_URLCONF = "config.urls_desktop"
