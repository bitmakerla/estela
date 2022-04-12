from django.conf import settings
import boto3
from credentials import Credentials


class AWSCredentials(Credentials):
    def __init__(self):
        self.credentials["AWS_ACCESS_KEY_ID"] = settings.AWS_ACCESS_KEY_ID
        self.credentials["AWS_SECRET_ACCESS_KEY"] = settings.AWS_SECRET_ACCESS_KEY
        self.credentials["AWS_DEFAULT_REGION"] = settings.AWS_DEFAULT_REGION

    def get_registry_token(self):
        ecr_client = boto3.client("ecr")
        response = ecr_client.get_authorization_token()
        token = [
            auth_data["authorizationToken"]
            for auth_data in response["authorizationData"]
            if auth_data["proxyEndpoint"] == settings.REGISTRY_HOST
        ]
        if token:
            return token[0]
        return None

    def get_credentials(self):
        self.credentials["REGISTRY_TOKEN"] = self.get_registry_token()
        return self.credentials
