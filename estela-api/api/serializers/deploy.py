from datetime import datetime

from rest_framework import serializers
from django.conf import settings

from api.serializers.project import UserDetailSerializer
from api.serializers.spider import SpiderSerializer
from config.job_manager import spiderdata_db_client
from core.models import Deploy, Spider
from engines.kubernetes import KubernetesEngine

_k8s = KubernetesEngine()


class DeploySerializer(serializers.ModelSerializer):
    spiders_count = serializers.SerializerMethodField(help_text="Number of spiders in this deploy.")
    user = UserDetailSerializer(
        required=True, help_text="User who performed the deploy."
    )

    def get_spiders_count(self, obj):
        return obj.spiders.count()

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.status == Deploy.BUILDING_STATUS:
            namespace = getattr(settings, "K8S_NAMESPACE", "default")
            stage = _k8s.get_deploy_stage(instance.did, namespace)
            if stage:
                data["status"] = stage
        return data

    class Meta:
        model = Deploy
        fields = ["did", "project", "user", "status", "spiders_count", "created"]


class DeployCreateSerializer(serializers.ModelSerializer):
    project_zip = serializers.FileField(
        write_only=True, help_text="Zip file containing the project."
    )

    class Meta:
        model = Deploy
        fields = ["did", "status", "created", "project_zip"]


class DeployUpdateSerializer(serializers.ModelSerializer):
    spiders_names = serializers.ListField(
        child=serializers.CharField(max_length=1000),
        required=False,
        help_text="Spider names in this deploy.",
    )
    error_reason = serializers.CharField(
        write_only=True,
        required=False,
        allow_null=True,
        allow_blank=True,
        max_length=200_000,
        help_text="Error logs to persist in deploy_logs (Mongo) on failure.",
    )

    class Meta:
        model = Deploy
        fields = ["did", "status", "spiders_names", "error_reason"]

    def update(self, instance, validated_data):
        status = validated_data.get("status", instance.status)
        spiders_names = validated_data.get("spiders_names", [])
        error_reason = validated_data.pop("error_reason", None)
        project = instance.project
        if status != instance.status:
            if instance.status != Deploy.BUILDING_STATUS:
                raise serializers.ValidationError(
                    {
                        "error": "The deploy has finished and its status cannot be changed."
                    }
                )
            else:
                instance.status = status
                if status == Deploy.FAILURE_STATUS and error_reason and spiderdata_db_client.get_connection():
                    db = str(project.pid)
                    spiderdata_db_client.client[db]["deploy_logs"].insert_one({
                        "deploy_id": instance.did,
                        "logs": f"=== Deploy ===\n{error_reason}",
                        "created": datetime.utcnow(),
                    })

            if status == Deploy.SUCCESS_STATUS and spiders_names:
                project.spiders.filter(name__in=spiders_names, deleted=True).update(
                    deleted=False
                )
                for spider in project.spiders.exclude(name__in=spiders_names).filter(deleted=False):
                    spider.deleted = True
                    spider.save()
                new_spiders = [
                    Spider(
                        name=spider_name,
                        project=project,
                        data_status=project.data_status,
                        data_expiry_days=project.data_expiry_days,
                    )
                    for spider_name in spiders_names
                    if not project.spiders.filter(name=spider_name).exists()
                ]
                Spider.objects.bulk_create(new_spiders)
                for spider_name in spiders_names:
                    spider = project.spiders.filter(name=spider_name).get()
                    instance.spiders.add(spider)
            instance.save()
        return instance
