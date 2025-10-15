from rest_framework import serializers

from core.models import Connection, Project


class ConnectionSerializer(serializers.ModelSerializer):
    cid = serializers.IntegerField(read_only=True, help_text="Connection ID.")
    name = serializers.CharField(help_text="Connection name.")
    conn_type = serializers.ChoiceField(
        choices=Connection.CONNECTION_TYPE_CHOICES,
        help_text="Connection type."
    )
    host = serializers.CharField(
        required=False, allow_blank=True, help_text="Connection host."
    )
    port = serializers.CharField(
        required=False, allow_blank=True, help_text="Connection port."
    )
    login = serializers.CharField(
        required=False, allow_blank=True, help_text="Connection login/username."
    )
    password = serializers.CharField(
        write_only=True, required=False, allow_blank=True,
        help_text="Connection password."
    )
    extra = serializers.JSONField(
        required=False, help_text="Additional connection configuration."
    )
    project = serializers.PrimaryKeyRelatedField(
        read_only=True,
        help_text="Project this connection belongs to."
    )
    created = serializers.DateTimeField(read_only=True, help_text="Creation date.")
    updated = serializers.DateTimeField(read_only=True, help_text="Last update date.")

    class Meta:
        model = Connection
        fields = [
            "cid", "name", "conn_type", "host", "port", "login", "password",
            "extra", "project", "created", "updated"
        ]

    def validate(self, data):
        conn_type = data.get("conn_type")
        
        # Validation based on connection type
        if conn_type == Connection.DATABASE:
            if not data.get("host"):
                raise serializers.ValidationError("Host is required for database connections.")
        elif conn_type == Connection.S3:
            if not data.get("login") or not data.get("password"):
                raise serializers.ValidationError("Access key and secret key are required for S3 connections.")
        elif conn_type in [Connection.FTP, Connection.SFTP]:
            if not data.get("host"):
                raise serializers.ValidationError("Host is required for FTP/SFTP connections.")
        elif conn_type in [Connection.HTTP, Connection.WEBHOOK]:
            if not data.get("host"):
                raise serializers.ValidationError("URL/Host is required for HTTP/Webhook connections.")
                
        return data


class ConnectionListSerializer(serializers.ModelSerializer):
    cid = serializers.IntegerField(read_only=True, help_text="Connection ID.")
    name = serializers.CharField(help_text="Connection name.")
    conn_type = serializers.CharField(help_text="Connection type.")
    conn_type_display = serializers.CharField(
        source="get_conn_type_display", read_only=True,
        help_text="Human readable connection type."
    )
    created = serializers.DateTimeField(read_only=True, help_text="Creation date.")

    class Meta:
        model = Connection
        fields = ["cid", "name", "conn_type", "conn_type_display", "created"]


class ConnectionTestSerializer(serializers.Serializer):
    success = serializers.BooleanField(help_text="Whether the connection test was successful.")
    message = serializers.CharField(help_text="Test result message.")
    details = serializers.JSONField(required=False, help_text="Additional test details.")