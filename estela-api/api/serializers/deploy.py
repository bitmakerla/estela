from rest_framework import serializers

from api.serializers.project import UserDetailSerializer
from api.serializers.spider import SpiderSerializer
from core.models import Deploy, Spider


class DeploySerializer(serializers.ModelSerializer):
    spiders = SpiderSerializer(
        many=True, required=False, help_text="Spiders in this deploy."
    )
    user = UserDetailSerializer(
        required=True, help_text="User who performed the deploy."
    )

    class Meta:
        model = Deploy
        fields = ["did", "project", "user", "status", "spiders", "created"]


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
                    Spider(name=spider_name, project=project)
                    for spider_name in spiders_names
                    if not project.spiders.filter(name=spider_name).exists()
                ]
                Spider.objects.bulk_create(new_spiders)
                for spider_name in spiders_names:
                    spider = project.spiders.filter(name=spider_name).get()
                    instance.spiders.add(spider)
            instance.save()
        return instance
