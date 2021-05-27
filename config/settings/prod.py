from config.settings.base import *  # noqa: F401,F403,F405

DEBUG = False

ALLOWED_HOSTS = env("DJANGO_ALLOWED_HOSTS").split(",")

RUN_JOBS_PER_LOT = 10
