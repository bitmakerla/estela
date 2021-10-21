from storages.backends.s3boto3 import S3Boto3Storage
from config.settings import prod


class MediaStorage(S3Boto3Storage):
    location = prod.MEDIAFILES_LOCATION
    file_overwrite = False


class StaticStorage(S3Boto3Storage):
    location = prod.STATICFILES_LOCATION
