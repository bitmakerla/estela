import json
import logging
from typing import Dict, Any

import requests
from ftplib import FTP, error_perm as FTPError

from django.shortcuts import get_object_or_404
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework.response import Response

from api.mixins import BaseViewSet
from api.serializers.connection import (
    ConnectionSerializer,
    ConnectionListSerializer,
    ConnectionTestSerializer
)
from core.models import Connection, Project

logger = logging.getLogger(__name__)


class ConnectionViewSet(BaseViewSet, viewsets.ModelViewSet):
    model_class = Connection
    serializer_class = ConnectionSerializer
    lookup_field = "cid"
    
    @swagger_auto_schema(
        responses={200: ConnectionListSerializer(many=True)},
        operation_description="List connections for a project"
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)
    
    @swagger_auto_schema(
        request_body=ConnectionSerializer,
        responses={201: ConnectionSerializer},
        operation_description="Create a new connection"
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)
    
    @swagger_auto_schema(
        responses={200: ConnectionSerializer},
        operation_description="Retrieve a connection"
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)
    
    @swagger_auto_schema(
        request_body=ConnectionSerializer,
        responses={200: ConnectionSerializer},
        operation_description="Update a connection"
    )
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)
    
    @swagger_auto_schema(
        request_body=ConnectionSerializer,
        responses={200: ConnectionSerializer},
        operation_description="Partially update a connection"
    )
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)
    
    @swagger_auto_schema(
        responses={204: 'Connection deleted'},
        operation_description="Delete a connection"
    )
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)

    def get_queryset(self):
        """Filter connections by project permissions."""
        project_pid = self.kwargs.get('pid')
        project = get_object_or_404(Project, pid=project_pid)
        
        # Check user has access to this project
        if not self.request.user.is_superuser and not project.users.filter(id=self.request.user.id).exists():
            raise PermissionDenied("You don't have permission to access this project's connections.")
        
        return Connection.objects.filter(project=project)

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == "list":
            return ConnectionListSerializer
        elif self.action == "test_connection":
            return ConnectionTestSerializer
        return ConnectionSerializer

    def perform_create(self, serializer):
        """Ensure user has permission to create connections in the project."""
        project_pid = self.kwargs.get('pid')
        project = get_object_or_404(Project, pid=project_pid)
        
        if not self.request.user.is_superuser and not project.users.filter(id=self.request.user.id).exists():
            raise PermissionDenied("You don't have permission to create connections in this project.")
        
        serializer.save(project=project)

    def perform_update(self, serializer):
        """Ensure user has permission to update the connection."""
        connection = self.get_object()
        if not connection.project.users.filter(id=self.request.user.id).exists():
            raise PermissionDenied("You don't have permission to update this connection.")
        serializer.save()

    def perform_destroy(self, instance):
        """Ensure user has permission to delete the connection."""
        if not instance.project.users.filter(id=self.request.user.id).exists():
            raise PermissionDenied("You don't have permission to delete this connection.")
        
        # Check if connection is being used by any DAGs
        if hasattr(instance, 'airflow_dags') and instance.airflow_dags.exists():
            raise ValidationError("Cannot delete connection that is being used by active DAGs.")
        
        instance.delete()

    @swagger_auto_schema(
        method="post",
        operation_description="Test connection configuration",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={}
        ),
        responses={
            200: ConnectionTestSerializer,
            400: "Bad Request"
        }
    )
    @action(detail=True, methods=["post"])
    def test_connection(self, request, pid=None, cid=None):
        """Test the connection configuration."""
        connection = self.get_object()
        
        # Ensure user has permission to test the connection
        if not connection.project.users.filter(id=request.user.id).exists():
            raise PermissionDenied("You don't have permission to test this connection.")
        
        try:
            test_result = self._test_connection_by_type(connection)
            serializer = ConnectionTestSerializer(test_result)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Connection test failed for {connection.name}: {str(e)}")
            test_result = {
                "success": False,
                "message": f"Connection test failed: {str(e)}"
            }
            serializer = ConnectionTestSerializer(test_result)
            return Response(serializer.data, status=status.HTTP_400_BAD_REQUEST)

    def _test_connection_by_type(self, connection: Connection) -> Dict[str, Any]:
        """Test connection based on its type."""
        conn_type = connection.conn_type
        
        if conn_type == Connection.DATABASE:
            return self._test_database_connection(connection)
        elif conn_type == Connection.S3:
            return self._test_s3_connection(connection)
        elif conn_type == Connection.FTP:
            return self._test_ftp_connection(connection)
        elif conn_type == Connection.SFTP:
            return self._test_sftp_connection(connection)
        elif conn_type == Connection.HTTP:
            return self._test_http_connection(connection)
        elif conn_type == Connection.WEBHOOK:
            return self._test_webhook_connection(connection)
        else:
            return {
                "success": False,
                "message": f"Connection type {conn_type} is not supported for testing."
            }

    def _test_database_connection(self, connection: Connection) -> Dict[str, Any]:
        """Test database connection."""
        extra = connection.extra or {}
        db_type = extra.get("database_type", "postgresql")
        
        try:
            if db_type == "postgresql":
                import psycopg2
                conn = psycopg2.connect(
                    host=connection.host,
                    port=connection.port or 5432,
                    database=extra.get("database", "postgres"),
                    user=connection.login,
                    password=connection.password,
                    connect_timeout=10
                )
                conn.close()
            elif db_type == "mongodb":
                import pymongo
                client = pymongo.MongoClient(
                    host=connection.host,
                    port=int(connection.port or 27017),
                    username=connection.login,
                    password=connection.password,
                    serverSelectionTimeoutMS=10000
                )
                client.server_info()
                client.close()
            elif db_type == "redis":
                import redis
                r = redis.Redis(
                    host=connection.host,
                    port=int(connection.port or 6379),
                    password=connection.password,
                    socket_connect_timeout=10
                )
                r.ping()
            elif db_type == "mysql":
                import pymysql
                conn = pymysql.connect(
                    host=connection.host,
                    port=int(connection.port or 3306),
                    database=extra.get("database", "mysql"),
                    user=connection.login,
                    password=connection.password,
                    connect_timeout=10
                )
                conn.ping()
                conn.close()
            else:
                return {
                    "success": False,
                    "message": f"Database type {db_type} is not supported."
                }
            
            return {
                "success": True,
                "message": f"Successfully connected to {db_type} database."
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"Database connection failed: {str(e)}"
            }

    def _test_s3_connection(self, connection: Connection) -> Dict[str, Any]:
        """Test S3 connection."""
        try:
            import boto3
            extra = connection.extra or {}
            region = extra.get("region", "us-east-1")
            
            client = boto3.client(
                's3',
                aws_access_key_id=connection.login,
                aws_secret_access_key=connection.password,
                region_name=region
            )
            
            # Test by listing buckets
            client.list_buckets()
            
            return {
                "success": True,
                "message": "Successfully connected to S3."
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"S3 connection failed: {str(e)}"
            }

    def _test_ftp_connection(self, connection: Connection) -> Dict[str, Any]:
        """Test FTP connection."""
        try:
            ftp = FTP()
            ftp.connect(connection.host, int(connection.port or 21), timeout=10)
            if connection.login:
                ftp.login(connection.login, connection.password)
            else:
                ftp.login()
            ftp.quit()
            
            return {
                "success": True,
                "message": "Successfully connected to FTP server."
            }
        except (FTPError, OSError) as e:
            return {
                "success": False,
                "message": f"FTP connection failed: {str(e)}"
            }

    def _test_sftp_connection(self, connection: Connection) -> Dict[str, Any]:
        """Test SFTP connection."""
        try:
            from paramiko import SSHClient, AutoAddPolicy
            from paramiko.ssh_exception import AuthenticationException, SSHException
            ssh = SSHClient()
            ssh.set_missing_host_key_policy(AutoAddPolicy())
            ssh.connect(
                hostname=connection.host,
                port=int(connection.port or 22),
                username=connection.login,
                password=connection.password,
                timeout=10
            )
            ssh.close()
            
            return {
                "success": True,
                "message": "Successfully connected to SFTP server."
            }
        except (AuthenticationException, SSHException, OSError) as e:
            return {
                "success": False,
                "message": f"SFTP connection failed: {str(e)}"
            }

    def _test_http_connection(self, connection: Connection) -> Dict[str, Any]:
        """Test HTTP connection."""
        try:
            url = connection.host
            if not url.startswith(('http://', 'https://')):
                url = f"http://{url}"
            
            headers = {}
            extra = connection.extra or {}
            
            # Add authentication headers if provided
            if connection.login and connection.password:
                import base64
                credentials = base64.b64encode(f"{connection.login}:{connection.password}".encode()).decode()
                headers['Authorization'] = f"Basic {credentials}"
            
            # Add custom headers from extra config
            if 'headers' in extra:
                headers.update(extra['headers'])
            
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            
            return {
                "success": True,
                "message": f"Successfully connected to HTTP endpoint. Status: {response.status_code}",
                "details": {
                    "status_code": response.status_code,
                    "response_time": response.elapsed.total_seconds()
                }
            }
        except requests.RequestException as e:
            return {
                "success": False,
                "message": f"HTTP connection failed: {str(e)}"
            }

    def _test_webhook_connection(self, connection: Connection) -> Dict[str, Any]:
        """Test webhook connection with a test payload."""
        try:
            url = connection.host
            if not url.startswith(('http://', 'https://')):
                url = f"http://{url}"
            
            headers = {"Content-Type": "application/json"}
            extra = connection.extra or {}
            
            # Add authentication headers if provided
            if connection.login and connection.password:
                import base64
                credentials = base64.b64encode(f"{connection.login}:{connection.password}".encode()).decode()
                headers['Authorization'] = f"Basic {credentials}"
            
            # Add custom headers from extra config
            if 'headers' in extra:
                headers.update(extra['headers'])
            
            # Test payload
            test_payload = {
                "test": True,
                "message": "Connection test from Estela",
                "timestamp": "2025-01-01T00:00:00Z"
            }
            
            response = requests.post(
                url, 
                json=test_payload, 
                headers=headers, 
                timeout=10
            )
            response.raise_for_status()
            
            return {
                "success": True,
                "message": f"Successfully sent test webhook. Status: {response.status_code}",
                "details": {
                    "status_code": response.status_code,
                    "response_time": response.elapsed.total_seconds()
                }
            }
        except requests.RequestException as e:
            return {
                "success": False,
                "message": f"Webhook test failed: {str(e)}"
            }