"""
Django settings for bitmaker project.

Generated by 'django-admin startproject' using Django 3.1.1.

For more information on this file, see
https://docs.djangoproject.com/en/3.1/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/3.1/ref/settings/
"""

import environ
from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Set environment variables from environment file
env = environ.Env(
    DB_NAME=(str, "bitmaker_db"),
    DB_USER=(str, "dummy"),
    DB_PASSWORD=(str, "dummy"),
    DB_HOST=(str, "db"),
    DB_PORT=(str, "3306"),
    CLUSTER_HOST=(str, "dummy"),
    CLUSTER_NAME=(str, "dummy"),
    REGISTRY_HOST=(str, "dummy"),
    REPOSITORY_NAME=(str, "dummy"),
    CELERY_BROKER_URL=(str, "redis://redis"),
    CELERY_RESULT_BACKEND=(str, "redis://redis:6379/0"),
    DJANGO_API_HOST=(str, "127.0.0.1"),
    DJANGO_ALLOWED_HOSTS=(str, ""),
    KAFKA_HOSTS=(str, "127.0.0.1"),
    KAFKA_PORT=(str, "9092"),
    CORS_ORIGIN_WHITELIST=(str, "http://127.0.0.1:3000"),
)

environ.Env.read_env(env_file=".env")


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/3.1/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = "***REMOVED***"

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = False

DJANGO_API_HOST = env("DJANGO_API_HOST")
ALLOWED_HOSTS = env("DJANGO_ALLOWED_HOSTS").split(",")


# Application definition

DEFAULT_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "django_celery_beat",
    "drf_yasg",
    "rest_framework",
    "rest_framework.authtoken",
]

PROJECT_APPS = [
    "api",
    "core",
]

INSTALLED_APPS = DEFAULT_APPS + THIRD_PARTY_APPS + PROJECT_APPS

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "corsheaders.middleware.CorsMiddleware",
]

CORS_ORIGIN_WHITELIST = env("CORS_ORIGIN_WHITELIST").split(",")

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"


# Database
# https://docs.djangoproject.com/en/3.1/ref/settings/#databases

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.mysql",
        "HOST": env("DB_HOST"),
        "PORT": env("DB_PORT"),
        "NAME": env("DB_NAME"),
        "USER": env("DB_USER"),
        "PASSWORD": env("DB_PASSWORD"),
    }
}


# Password validation
# https://docs.djangoproject.com/en/3.1/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


# Internationalization
# https://docs.djangoproject.com/en/3.1/topics/i18n/

LANGUAGE_CODE = "en-us"

TIME_ZONE = "UTC"

USE_I18N = True

USE_L10N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/3.1/howto/static-files/

STATIC_URL = "/static/"


# Pagination settings used in api_app

API_PAGE_SIZE = 100  # Paginator page size
API_MAX_PAGE_SIZE = 100  # Maximum allowable requested page size


# Cluster Settings

CLUSTER_HOST = env("CLUSTER_HOST")
CLUSTER_NAME = env("CLUSTER_NAME")


# Container Registry Settings

REGISTRY_HOST = env("REGISTRY_HOST")
REPOSITORY_NAME = env("REPOSITORY_NAME")


# Celery settings

CELERY_BROKER_URL = env("CELERY_BROKER_URL")
CELERY_RESULT_BACKEND = env("CELERY_RESULT_BACKEND")
CELERY_BEAT_SCHEDULER = "django_celery_beat.schedulers:DatabaseScheduler"


# Kafka settings

KAFKA_HOSTS = env("KAFKA_HOSTS")
KAFKA_PORT = env("KAFKA_PORT")

# Kubernetes settings

MULTI_NODE_MODE = False


SWAGGER_SETTINGS = {
    "DEFAULT_INFO": "docs.settings.api_info",
    "DEFAULT_GENERATOR_CLASS": "docs.settings.APISchemeGenerator",
    "DEFAULT_API_URL": "http://127.0.0.1:8000",
}
