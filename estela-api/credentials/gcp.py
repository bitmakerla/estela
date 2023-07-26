import json

import google.auth
from credentials import Credentials
from django.conf import settings
from google.cloud import storage


class GCPCredentials(Credentials):
    def __init__(self):
        credentials, _ = google.auth.load_credentials_from_dict(json.loads(settings.GOOGLE_APPLICATION_CREDENTIALS))
        self.credentials["GOOGLE_APPLICATION_PROJECT_ID"] = credentials.quota_project_id
        self.credentials["GOOGLE_APPLICATION_CREDENTIALS"] = settings.GOOGLE_APPLICATION_CREDENTIALS
        self.credentials["GOOGLE_APPLICATION_LOCATION"] = settings.GOOGLE_APPLICATION_LOCATION
        self.auth_credential = credentials

    def get_registry_token(self):
        # No es necesario obtener un token de registro para Google Cloud Storage
        return None

    def download_project(self, bucket_name, project_name):
        client = storage.Client(credentials=self.auth_credential, project=self.credentials["GOOGLE_APPLICATION_PROJECT_ID"])
        bucket = client.bucket(bucket_name)
        blob = bucket.blob(project_name)
        blob.download_to_filename(project_name)

    def upload_project(self, project_name, project_obj):
        client = storage.Client(credentials=self.auth_credential, project=self.credentials["GOOGLE_APPLICATION_PROJECT_ID"])
        bucket = client.bucket(settings.PROJECT_BUCKET)
        blob = bucket.blob(project_name)
        try:
            blob.upload_from_file(project_obj)
        except Exception as e:
            return str(e)
        return False

    def get_credentials(self):
        return self.credentials