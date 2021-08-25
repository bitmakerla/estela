from storages.backends.s3boto3 import S3Boto3Storage
from config.settings import base


class MediaStorage(S3Boto3Storage):
    location = base.MEDIAFILES_LOCATION
    file_overwrite = False


class StaticStorage(S3Boto3Storage):
    location = base.STATICFILES_LOCATION
