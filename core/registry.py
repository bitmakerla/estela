import boto3
from django.conf import settings

ecr_client = boto3.client("ecr")


def get_registry_token():
    response = ecr_client.get_authorization_token()
    token = [
        auth_data["authorizationToken"]
        for auth_data in response["authorizationData"]
        if auth_data["proxyEndpoint"] == settings.REGISTRY_HOST
    ][0]
    return token
