"""Settings for pytest / CI: SQLite in-memory DB, eager Celery, no Redis broker.

``pytest.ini`` sets ``DJANGO_SETTINGS_MODULE = config.settings.test``. Run tests from
``estela-api`` (``pythonpath = ..`` in pytest.ini pulls in repo-level ``database_adapters``).
"""

import sys
from unittest.mock import MagicMock

# ``base`` imports ``get_queue_env_vars`` at module level; stub before that import.
sys.modules.setdefault(
    "estela_queue_adapter",
    MagicMock(get_queue_env_vars=lambda: {}),
)

from config.settings.base import *  # noqa: E402,F401,F403,F405

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

# No Redis broker for workers: avoid depending on env ``REDIS_URL`` during app init.
CELERY_BROKER_URL = "memory://"
CELERY_RESULT_BACKEND = None
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

QUEUE_PARAMS = {}

# Values from env are often "dummy" for local dev; unit tests only need valid literals.
CREDENTIALS = "local"
ENGINE = "kubernetes"
BUILD = "default"
SPIDERDATA_DB_ENGINE = "mongodb"
SPIDERDATA_DB_PRODUCTION = False
SPIDERDATA_DB_CONNECTION = "mongodb://127.0.0.1:27017"
SPIDERDATA_DB_CERTIFICATE_PATH = ""
