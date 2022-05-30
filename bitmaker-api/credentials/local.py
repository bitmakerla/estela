from credentials import Credentials
from minio import Minio
from django.conf import settings


class LocalCredentials(Credentials):
    def __init__(self):
        pass

    def get_registry_token(self):
        return None
    
    def upload_project(self, project_name, project_obj):
        minio_client = Minio("storage:9000", "bitmakerminio", "bitmakerminio", secure=False)
        try:
            minio_client.put_object(settings.PROJECT_BUCKET, project_name, project_obj, length=-1, part_size=10*1024*1024)
        except Exception as ex:
            return ex
        return False

    def download_project(self, bucket_name, project_name):
        minio_client = Minio("storage:9000", "minioadmin", "minioadmin", secure=False)
        minio_client.fget_object(bucket_name, project_name, project_name)
        
    def get_credentials(self):
        self.credentials["REGISTRY_TOKEN"] = self.get_registry_token()
        return self.credentials
