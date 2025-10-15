import logging
import requests
from typing import Dict, Any

from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from api.mixins import BaseViewSet
from api.serializers.data_export import (
    DataExportSerializer,
    DataExportCreateSerializer,
    DataExportListSerializer,
    WebhookUpdateSerializer
)
from core.models import DataExport, SpiderJob, Connection, Project

logger = logging.getLogger(__name__)


class DataExportViewSet(BaseViewSet, viewsets.ModelViewSet):
    model_class = DataExport
    serializer_class = DataExportSerializer
    lookup_field = "eid"
    
    def get_queryset(self):
        """Filter exports by SpiderJob permissions."""
        jid = self.kwargs.get('jid')
        spider_job = get_object_or_404(SpiderJob, jid=jid)
        
        # Check user has access to this project
        if not self.request.user.is_superuser and not spider_job.spider.project.users.filter(id=self.request.user.id).exists():
            raise PermissionDenied("You don't have permission to access this job's exports.")
        
        return DataExport.objects.filter(spider_job=spider_job)

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == "list":
            return DataExportListSerializer
        elif self.action == "create":
            return DataExportCreateSerializer
        return DataExportSerializer

    def get_serializer_context(self):
        """Add project context to serializer."""
        context = super().get_serializer_context()
        jid = self.kwargs.get('jid')
        if jid:
            spider_job = get_object_or_404(SpiderJob, jid=jid)
            context['project'] = spider_job.spider.project
        return context

    def get_serializer(self, *args, **kwargs):
        """Pass project context to serializer."""
        if self.action == "create":
            jid = self.kwargs.get('jid')
            spider_job = get_object_or_404(SpiderJob, jid=jid)
            kwargs['project'] = spider_job.spider.project
        return super().get_serializer(*args, **kwargs)

    @swagger_auto_schema(
        responses={200: DataExportListSerializer(many=True)},
        operation_description="List data exports for a spider job"
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)
    
    @swagger_auto_schema(
        request_body=DataExportCreateSerializer,
        responses={201: DataExportSerializer},
        operation_description="Create a new data export request"
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)
    
    @swagger_auto_schema(
        responses={200: DataExportSerializer},
        operation_description="Retrieve a data export"
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    def perform_create(self, serializer):
        """Create data export and trigger Airflow DAG."""
        jid = self.kwargs.get('jid')
        spider_job = get_object_or_404(SpiderJob, jid=jid)
        
        # Ensure user has permission to export data from this job
        if not self.request.user.is_superuser and not spider_job.spider.project.users.filter(id=self.request.user.id).exists():
            raise PermissionDenied("You don't have permission to export data from this job.")
        
        # Validate that the job is completed
        if spider_job.status != SpiderJob.COMPLETED_STATUS:
            raise ValidationError("Can only export data from completed jobs.")
        
        # Validate connection is S3 type
        connection = serializer.validated_data['connection']
        if connection.conn_type != Connection.S3:
            raise ValidationError("Can only export to S3 connections.")
        
        data_export = serializer.save(spider_job=spider_job)
        
        # Trigger Airflow DAG
        try:
            self._trigger_airflow_dag(data_export)
            data_export.status = DataExport.IN_PROGRESS
            data_export.started_at = timezone.now()
            data_export.save()
        except Exception as e:
            logger.error(f"Failed to trigger Airflow DAG for export {data_export.eid}: {str(e)}")
            data_export.status = DataExport.FAILED
            data_export.error_message = f"Failed to trigger Airflow DAG: {str(e)}"
            data_export.save()

    def _trigger_airflow_dag(self, data_export: DataExport):
        """Trigger Airflow DAG for data export."""
        # Hard-coded credentials for now (TODO: move to settings)
        airflow_host = "https://airflow.staging.bitmaker.dev"
        airflow_username = "admin"
        airflow_password = "1742ebfb528e991eb17e8ceb37d15b5b"
        dag_id = data_export.dag_name
        
        # Get JWT token from Airflow using correct endpoint
        auth_payload = {
            "username": airflow_username,
            "password": airflow_password
        }
        
        auth_response = requests.post(
            f"{airflow_host}/auth/token",
            json=auth_payload,
            timeout=30,
            verify=False
        )
        
        if auth_response.status_code not in [200, 201]:
            raise Exception(f"Airflow authentication failed: {auth_response.text}")
        
        token = auth_response.json().get("access_token")
        if not token:
            raise Exception("Failed to get Airflow access token")
        
        # Hardcoded spider job ID for testing
        spider_job_id = "c9f12127-6791-4122-8be4-b8cab90a656d.1156.201390"
        
        # Construct payload for Airflow DAG trigger (v2 API format)
        dag_payload = {
            "conf": {
                "spider_job_id": spider_job_id,
                "connection_id": data_export.connection.cid,
                "export_id": data_export.eid,
                "webhook_url": f"{self.request.build_absolute_uri('/api/data-exports/webhook/')}{data_export.webhook_token}/",
                "s3_config": {
                    "access_key": data_export.connection.login,
                    "secret_key": data_export.connection.password,
                    "bucket": data_export.connection.extra.get("bucket", ""),
                    "region": data_export.connection.extra.get("region", "us-east-1"),
                    "prefix": data_export.connection.extra.get("prefix", f"estela-exports/{data_export.spider_job.jid}/")
                }
            }
        }
        
        # Add logical_date to payload (required for Airflow 3.0+)
        if 'logical_date' not in dag_payload:
            dag_payload['logical_date'] = timezone.now().strftime('%Y-%m-%dT%H:%M:%SZ')
        
        # Trigger DAG using v2 API endpoint
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        dag_response = requests.post(
            f"{airflow_host}/api/v2/dags/{dag_id}/dagRuns",
            json=dag_payload,
            headers=headers,
            timeout=30,
            verify=False
        )
        
        if dag_response.status_code not in [200, 201]:
            raise Exception(f"Airflow DAG trigger failed: {dag_response.text}")
        
        # Extract DAG run ID from response
        dag_run_data = dag_response.json()
        data_export.dag_run_id = dag_run_data.get("dag_run_id")
        data_export.save()
        
        logger.info(f"Successfully triggered Airflow DAG {dag_id} with run ID: {data_export.dag_run_id}")


@swagger_auto_schema(
    method="post",
    operation_description="Webhook endpoint for Airflow to update export status",
    request_body=WebhookUpdateSerializer,
    responses={
        200: "Status updated successfully",
        404: "Export not found",
        400: "Bad Request"
    }
)
@api_view(["POST"])
@permission_classes([AllowAny])  # Webhook endpoint - no auth required but uses token verification
def webhook_export_update(request, webhook_token):
    """Webhook endpoint for Airflow to update export status."""
    try:
        data_export = get_object_or_404(DataExport, webhook_token=webhook_token)
    except DataExport.DoesNotExist:
        return Response(
            {"error": "Invalid webhook token"}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    serializer = WebhookUpdateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    # Update export status
    data = serializer.validated_data
    data_export.status = data['status']
    
    if data.get('dag_run_id'):
        data_export.dag_run_id = data['dag_run_id']
    if data.get('export_path'):
        data_export.export_path = data['export_path']
    if data.get('error_message'):
        data_export.error_message = data['error_message']
    if data.get('started_at'):
        data_export.started_at = data['started_at']
    if data.get('completed_at'):
        data_export.completed_at = data['completed_at']
    
    data_export.save()
    
    logger.info(f"Export {data_export.eid} status updated to {data_export.status}")
    
    return Response({"message": "Status updated successfully"})