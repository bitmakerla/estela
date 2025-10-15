from rest_framework import serializers

from core.models import DataExport, Connection, SpiderJob


class DataExportSerializer(serializers.ModelSerializer):
    eid = serializers.IntegerField(read_only=True, help_text="Export ID.")
    status = serializers.CharField(read_only=True, help_text="Export status.")
    dag_run_id = serializers.CharField(read_only=True, help_text="Airflow DAG run ID.")
    dag_name = serializers.CharField(read_only=True, help_text="Airflow DAG name.")
    webhook_token = serializers.CharField(read_only=True, help_text="Webhook token.")
    export_path = serializers.CharField(read_only=True, help_text="Export path.")
    error_message = serializers.CharField(read_only=True, help_text="Error message.")
    started_at = serializers.DateTimeField(read_only=True, help_text="Start time.")
    completed_at = serializers.DateTimeField(read_only=True, help_text="Completion time.")
    created = serializers.DateTimeField(read_only=True, help_text="Creation date.")
    updated = serializers.DateTimeField(read_only=True, help_text="Last update date.")
    
    # Nested serializers for related objects
    connection_name = serializers.CharField(source="connection.name", read_only=True)
    connection_type = serializers.CharField(source="connection.get_conn_type_display", read_only=True)
    spider_job_id = serializers.IntegerField(source="spider_job.jid", read_only=True)

    class Meta:
        model = DataExport
        fields = [
            "eid", "status", "dag_run_id", "dag_name", "webhook_token",
            "export_path", "error_message", "started_at", "completed_at",
            "created", "updated", "connection_name", "connection_type", "spider_job_id"
        ]


class DataExportCreateSerializer(serializers.ModelSerializer):
    connection = serializers.PrimaryKeyRelatedField(
        queryset=Connection.objects.none(),  # Will be set in view
        help_text="Connection ID to export data to."
    )

    class Meta:
        model = DataExport
        fields = ["connection"]

    def __init__(self, *args, **kwargs):
        project = kwargs.pop('project', None)
        super().__init__(*args, **kwargs)
        if project:
            # Only show S3 connections from the same project
            self.fields['connection'].queryset = Connection.objects.filter(
                project=project,
                conn_type=Connection.S3
            )


class DataExportListSerializer(serializers.ModelSerializer):
    eid = serializers.IntegerField(read_only=True, help_text="Export ID.")
    status = serializers.CharField(read_only=True, help_text="Export status.")
    connection_name = serializers.CharField(source="connection.name", read_only=True)
    connection_type = serializers.CharField(source="connection.get_conn_type_display", read_only=True)
    created = serializers.DateTimeField(read_only=True, help_text="Creation date.")
    completed_at = serializers.DateTimeField(read_only=True, help_text="Completion time.")

    class Meta:
        model = DataExport
        fields = ["eid", "status", "connection_name", "connection_type", "created", "completed_at"]


class WebhookUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=DataExport.STATUS_CHOICES, help_text="Export status.")
    dag_run_id = serializers.CharField(required=False, help_text="Airflow DAG run ID.")
    export_path = serializers.CharField(required=False, help_text="Export path.")
    error_message = serializers.CharField(required=False, help_text="Error message.")
    started_at = serializers.DateTimeField(required=False, help_text="Start time.")
    completed_at = serializers.DateTimeField(required=False, help_text="Completion time.")