"""Render compatibility WSGI entrypoint.

The Django project lives in ``backend/``. Some Render services default to
``gunicorn app:app`` when no explicit start command is configured, so expose the
Django WSGI callable under that name as well.
"""

import os
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

from django.core.wsgi import get_wsgi_application

app = get_wsgi_application()
application = app
