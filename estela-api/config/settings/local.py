from config.settings.base import *  # noqa: F401,F403,F405

DEBUG = True

RUN_JOBS_PER_LOT = 10
CHECK_JOB_ERRORS_BATCH_SIZE = 10
COUNTDOWN_RECORD_PROJECT_USAGE_AFTER_JOB_EVENT = 30
COUNTDOWN_RECORD_COVERAGE_AFTER_JOB_EVENT = 30

SPIDERDATA_DB_PRODUCTION = False

if env("ENABLE_SENTRY"):
    with sentry_sdk.configure_scope() as scope:
        scope.set_tag("environment", "local")
