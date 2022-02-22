import boto3
from botocore.exceptions import ClientError
from ***REMOVED***.conf import settings

ecr_client = boto3.client("ecr")


def get_registry_token():
    response = ecr_client.get_authorization_token()
    token = [
        auth_data["authorizationToken"]
        for auth_data in response["authorizationData"]
        if auth_data["proxyEndpoint"] == settings.REGISTRY_HOST
    ]
    if token:
        return token[0]
    return None


def upload_project_to_s3(project_name, project_obj):
    s3_client = boto3.client("s3")
    try:
        s3_client.upload_fileobj(project_obj, settings.PROJECT_BUCKET, project_name)
    except ClientError as e:
        return e
    return False
