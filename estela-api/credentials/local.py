import os

from django.conf import settings
from minio import Minio

from credentials import Credentials


class LocalCredentials(Credentials):
    """
    Local credentials manager for development/standalone Docker deployments.

    Uses MinIO as S3-compatible storage. Configuration via environment variables:
    - MINIO_HOST: MinIO host (default: minio)
    - MINIO_PORT: MinIO port (default: 9000)
    - MINIO_ACCESS_KEY: Access key (default: minioadmin)
    - MINIO_SECRET_KEY: Secret key (default: minioadmin)
    - MINIO_SECURE: Use HTTPS (default: false)
    """

    def __init__(self):
        self.minio_host = os.environ.get("MINIO_HOST", "minio")
        self.minio_port = os.environ.get("MINIO_PORT", "9000")
        self.minio_access_key = os.environ.get("MINIO_ACCESS_KEY", "minioadmin")
        self.minio_secret_key = os.environ.get("MINIO_SECRET_KEY", "minioadmin")
        self.minio_secure = os.environ.get("MINIO_SECURE", "false").lower() == "true"

    def _get_minio_client(self):
        """Get configured MinIO client."""
        endpoint = f"{self.minio_host}:{self.minio_port}"
        return Minio(
            endpoint,
            self.minio_access_key,
            self.minio_secret_key,
            secure=self.minio_secure
        )

    def get_registry_token(self):
        return None

    def upload_project(self, project_name, project_obj):
        minio_client = self._get_minio_client()
        try:
            minio_client.put_object(
                settings.PROJECT_BUCKET,
                project_name,
                project_obj,
                length=-1,
                part_size=10 * 1024 * 1024,
            )
        except Exception as ex:
            return ex
        return False

    def download_project(self, bucket_name, project_name):
        minio_client = self._get_minio_client()
        minio_client.fget_object(bucket_name, project_name, project_name)

    def get_credentials(self):
        self.credentials["REGISTRY_TOKEN"] = self.get_registry_token()
        return self.credentials
