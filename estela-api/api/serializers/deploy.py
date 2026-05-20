from rest_framework import serializers
from django.conf import settings

from api.serializers.project import UserDetailSerializer
from api.serializers.spider import SpiderSerializer
from core.models import Deploy, Spider


def _get_deploy_stage(did: int) -> str | None:
    """Query K8s pod init-container statuses to determine DOWNLOADING vs BUILDING stage."""
    try:
        from kubernetes import client, config as k8s_config

        k8s_config.load_incluster_config()
        core_api = client.CoreV1Api()
        batch_api = client.BatchV1Api()
        namespace = getattr(settings, "K8S_NAMESPACE", "default")
        job_name = f"deploy-project-{did}"

        batch_api.read_namespaced_job(job_name, namespace)
        pods = core_api.list_namespaced_pod(namespace, label_selector=f"job-name={job_name}")
        if not pods.items:
            return None

        init_statuses = pods.items[0].status.init_container_statuses or []
        for i, ics in enumerate(init_statuses):
            if ics.state and (ics.state.running or ics.state.waiting):
                return "DOWNLOADING" if i == 0 else "BUILDING"
    except Exception:
        pass
    return None


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
            stage = _get_deploy_stage(instance.did)
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

    class Meta:
        model = Deploy
        fields = ["did", "status", "spiders_names"]

    def update(self, instance, validated_data):
        status = validated_data.get("status", instance.status)
        spiders_names = validated_data.get("spiders_names", [])
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

            if status == Deploy.SUCCESS_STATUS and spiders_names:
                project.spiders.filter(name__in=spiders_names, deleted=True).update(
                    deleted=False
                )
                project.spiders.exclude(name__in=spiders_names).update(deleted=True)
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
