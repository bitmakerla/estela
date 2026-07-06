from django.shortcuts import get_object_or_404
from rest_framework import serializers

from api import errors
from api.exceptions import DataBaseError
from api.serializers.job_specific import (
    SpiderJobArgSerializer,
    SpiderJobEnvVarSerializer,
    SpiderJobTagSerializer,
)
import redis as redis_lib
from django.conf import settings
from api.utils import (
    delete_stats_from_redis,
    update_stats_from_redis,
    get_collection_name,
)
from config.job_manager import job_manager, spiderdata_db_client
from core.error_logs import write_job_logs_to_mongo
from core.models import (
    DataStatus,
    SpiderJob,
    SpiderJobArg,
    SpiderJobEnvVar,
    SpiderJobTag,
)


class SpiderJobSerializer(serializers.ModelSerializer):
    args = SpiderJobArgSerializer(many=True, required=False, help_text="Job arguments.")
    env_vars = SpiderJobEnvVarSerializer(
        many=True, required=False, help_text="Job env variables."
    )
    tags = SpiderJobTagSerializer(many=True, required=False, help_text="Job tags.")
    name = serializers.CharField(
        required=False, read_only=True, help_text="Unique job name."
    )
    job_status = serializers.CharField(
        required=False, read_only=True, help_text="Current job status."
    )
    spider = serializers.SerializerMethodField("get_spider")
    database_insertion_progress = serializers.SerializerMethodField("get_database_insertion_progress")
    peak_memory = serializers.SerializerMethodField("get_peak_memory")

    class Meta:
        model = SpiderJob
        fields = (
            "jid",
            "spider",
            "created",
            "name",
            "lifespan",
            "total_response_bytes",
            "item_count",
            "request_count",
            "args",
            "env_vars",
            "tags",
            "job_status",
            "cronjob",
            "data_expiry_days",
            "data_status",
            "database_insertion_progress",
            "resource_tier",
            "peak_memory",
        )

    def get_spider(self, instance):
        return {"sid": instance.spider.sid, "name": instance.spider.name}

    def get_database_insertion_progress(self, instance):
        # Return the actual database insertion progress value from the model
        return instance.database_insertion_progress

    def get_peak_memory(self, instance):
        if instance.status == SpiderJob.RUNNING_STATUS:
            try:
                redis_conn = redis_lib.from_url(settings.REDIS_URL)
                raw_stats = redis_conn.hgetall(f"scrapy_stats_{instance.key}")
                if raw_stats:
                    job_stats = {key.decode(): value.decode() for key, value in raw_stats.items()}
                    mem = job_stats.get("resources/peak_memory_bytes") or job_stats.get("memusage/max")
                    if mem:
                        mem_bytes = int(float(mem))
                        if mem_bytes > 0:
                            return mem_bytes
            except Exception:
                pass
        else:
            try:
                if spiderdata_db_client.get_connection():
                    pid = str(instance.spider.project.pid)
                    job_collection_name = get_collection_name(instance, "stats")
                    job_stats = spiderdata_db_client.get_job_stats(pid, job_collection_name)
                    if job_stats:
                        for stat in job_stats:
                            mem = stat.get("resources/peak_memory_bytes")
                            if mem is not None:
                                mem_bytes = int(float(mem))
                                if mem_bytes > 0:
                                    return mem_bytes
            except Exception:
                pass
        return None


class SpiderJobDetailSerializer(SpiderJobSerializer):
    storage_size = serializers.SerializerMethodField("get_storage_size")

    class Meta(SpiderJobSerializer.Meta):
        fields = SpiderJobSerializer.Meta.fields + ("storage_size",)

    def get_storage_size(self, instance):
        if not spiderdata_db_client.get_connection():
            raise DataBaseError({"error": errors.UNABLE_CONNECT_DB})

        pid = str(instance.spider.project.pid)
        collections = ["items", "requests", "logs"]
        total_size = sum(
            [
                spiderdata_db_client.get_dataset_size(
                    pid, get_collection_name(instance, collection)
                )
                for collection in collections
            ]
        )
        return total_size


class SpiderJobCreateEnvVarSerializer(serializers.Serializer):
    evid = serializers.IntegerField(required=False, help_text="Env var id.")
    name = serializers.CharField(required=True, help_text="Env var name.")
    value = serializers.CharField(required=True, help_text="Env var value.")
    masked = serializers.BooleanField(
        required=False, default=False, help_text="Env var masked."
    )


class SpiderJobCreateSerializer(serializers.ModelSerializer):
    args = SpiderJobArgSerializer(many=True, required=False, help_text="Job arguments.")
    env_vars = SpiderJobCreateEnvVarSerializer(
        many=True, required=False, help_text="Job env variables."
    )
    tags = SpiderJobTagSerializer(many=True, required=False, help_text="Job tags.")
    name = serializers.CharField(
        required=False, read_only=True, help_text="Unique job name."
    )
    job_status = serializers.CharField(
        required=False, read_only=True, help_text="Current job status."
    )
    data_status = serializers.CharField(required=True, help_text="Data status.")
    data_expiry_days = serializers.IntegerField(
        required=False, help_text="Days before data expires."
    )

    class Meta:
        model = SpiderJob
        fields = (
            "jid",
            "name",
            "args",
            "env_vars",
            "tags",
            "job_status",
            "cronjob",
            "data_expiry_days",
            "data_status",
            "resource_tier",
        )

    def create(self, validated_data):
        args_data = validated_data.pop("args", [])
        env_vars_data = validated_data.pop("env_vars", [])
        tags_data = validated_data.pop("tags", [])

        job = SpiderJob.objects.create(**validated_data)
        for arg in args_data:
            SpiderJobArg.objects.create(job=job, **arg)

        for env_var in env_vars_data:
            evid = env_var.get("evid", None)
            if not evid:
                SpiderJobEnvVar.objects.create(job=job, **env_var)
            elif evid > 0:
                env = get_object_or_404(SpiderJobEnvVar, evid=evid)
                SpiderJobEnvVar.objects.create(
                    job=job,
                    name=env.name,
                    value=env.value,
                    masked=env.masked,
                )

        for tag_data in tags_data:
            tag, _ = SpiderJobTag.objects.get_or_create(**tag_data)
            job.tags.add(tag)

        job.save()
        return job


class SpiderJobUpdateSerializer(serializers.ModelSerializer):
    data_status = serializers.ChoiceField(
        choices=DataStatus.JOB_LEVEL_OPTIONS,
        required=False,
        help_text="Job data status.",
    )
    data_expiry_days = serializers.IntegerField(
        required=False,
        help_text="Job data expiry days.",
    )
    error_reason = serializers.CharField(
        write_only=True,
        required=False,
        allow_null=True,
        allow_blank=True,
        max_length=200_000,
        help_text="Error logs to persist in job_logs (Mongo) on failure.",
    )

    allowed_status_to_stop = [
        SpiderJob.WAITING_STATUS,
        SpiderJob.RUNNING_STATUS,
    ]

    job_fields = [
        "lifespan",
        "total_response_bytes",
        "item_count",
        "request_count",
        "proxy_usage_data",
    ]

    class Meta:
        model = SpiderJob
        fields = (
            "jid",
            "status",
            "lifespan",
            "total_response_bytes",
            "item_count",
            "request_count",
            "data_status",
            "data_expiry_days",
            "proxy_usage_data",
            "error_reason",
        )

    def update(self, instance, validated_data):
        status = validated_data.get("status", instance.status)
        data_status = validated_data.get("data_status", "")
        data_expiry_days = int(validated_data.get("data_expiry_days", 1))
        error_reason = validated_data.pop("error_reason", None)

        if status != instance.status:
            if instance.status == SpiderJob.STOPPED_STATUS:
                raise serializers.ValidationError({"error": "Job is stopped"})
            if status == SpiderJob.WAITING_STATUS:
                raise serializers.ValidationError({"error": "Invalid status"})
            if status == SpiderJob.STOPPED_STATUS:
                if instance.status not in self.allowed_status_to_stop:
                    raise serializers.ValidationError(
                        {
                            "error": errors.JOB_NOT_STOPPED.format(
                                *self.allowed_status_to_stop
                            )
                        }
                    )
                else:
                    if instance.status == SpiderJob.RUNNING_STATUS:
                        try:
                            update_stats_from_redis(instance, save_to_database=True)
                            delete_stats_from_redis(instance)
                        except Exception:
                            pass
                        instance.save()
                    job_manager.delete_job(instance.name)
            if status == SpiderJob.ERROR_STATUS and error_reason:
                write_job_logs_to_mongo(instance, error_reason)
        instance.status = status

        for field in self.job_fields:
            if not getattr(instance, field) or getattr(
                instance, field
            ) != validated_data.get(field):
                new_value = validated_data.get(field, getattr(instance, field))
                setattr(instance, field, new_value)

        if (
            "data_status" in validated_data
            and instance.data_status != DataStatus.DELETED_STATUS
        ):
            instance.data_status = data_status
            if data_status == DataStatus.PENDING_STATUS and data_expiry_days > 0:
                instance.data_expiry_days = data_expiry_days
            else:
                raise serializers.ValidationError({"error": errors.INVALID_DATA_STATUS})

        instance.save()
        return instance


class ProjectJobSerializer(serializers.Serializer):
    results = SpiderJobSerializer(many=True, required=True, help_text="Project jobs.")
    count = serializers.IntegerField(required=True, help_text="Project jobs count.")
