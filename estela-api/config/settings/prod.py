from config.settings.base import *  # noqa: F401,F403,F405

DEBUG = False

RUN_JOBS_PER_LOT = 1000
CHECK_JOB_ERRORS_BATCH_SIZE = 1000

MULTI_NODE_MODE = True

# S3 STATIC SETTINGS
STATICFILES_LOCATION = "static"
MEDIAFILES_LOCATION = "media"

AWS_STORAGE_BUCKET_NAME = env("AWS_STORAGE_BUCKET_NAME")
AWS_DEFAULT_ACL = "public-read"
AWS_S3_CUSTOM_DOMAIN = "{}.s3.amazonaws.com".format(AWS_STORAGE_BUCKET_NAME)
AWS_S3_OBJECT_PARAMETERS = {"CacheControl": "max-age=86400"}

STATICFILES_STORAGE = "config.storage_backends.StaticStorage"
DEFAULT_FILE_STORAGE = "config.storage_backends.MediaStorage"
STATIC_URL = "https://{}/{}/".format(AWS_S3_CUSTOM_DOMAIN, STATICFILES_LOCATION)
MEDIA_URL = "https://{}/{}/".format(AWS_S3_CUSTOM_DOMAIN, MEDIAFILES_LOCATION)
