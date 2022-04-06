import boto3
from botocore.exceptions import ClientError
from django.conf import settings


def upload_project_to_s3(project_name, project_obj):
    s3_client = boto3.client("s3")
    try:
        s3_client.upload_fileobj(project_obj, settings.PROJECT_BUCKET, project_name)
    except ClientError as e:
        return e
    return False
