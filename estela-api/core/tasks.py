import json
from collections import defaultdict
from datetime import timedelta, datetime
from typing import List
import logging

from celery import chain
from celery.exceptions import TaskError
from django.conf import settings
from django.utils import timezone
from rest_framework.authtoken.models import Token

from api.serializers.job import SpiderJobCreateSerializer
from api.utils import (
    delete_stats_from_redis,
    get_proxy_provider_envs,
    update_stats_from_redis,
)
from config.celery import app as celery_app
from config.job_manager import job_manager, spiderdata_db_client
from core.models import (
    DataStatus,
    Project,
    ProxyProvider,
    Spider,
    SpiderJob,
    UsageRecord,
)
from core.tiers import get_tier_resources

import redis
from kubernetes import client, config

WORKERS_CAPACITY_THRESHOLD = settings.WORKERS_CAPACITY_THRESHOLD

def get_default_token(job):
    user = job.spider.project.users.first()
    if not user:
        return None
    token, _ = Token.objects.get_or_create(user=user)
    return token.key


RUN_SPIDER_JOBS_LOCK_KEY = "estela:run_spider_jobs:lock"
RUN_SPIDER_JOBS_LOCK_TIMEOUT = 120


@celery_app.task
def run_spider_jobs():
    redis_client = redis.from_url(settings.REDIS_URL)

    if not redis_client.set(RUN_SPIDER_JOBS_LOCK_KEY, "1", nx=True, ex=RUN_SPIDER_JOBS_LOCK_TIMEOUT):
        logging.info("run_spider_jobs: previous execution still running, skipping")
        return

    try:
        jobs = SpiderJob.objects.filter(status=SpiderJob.IN_QUEUE_STATUS).order_by("created")[
            : settings.RUN_JOBS_PER_LOT
        ]

        cluster = _get_cluster_resources()
        if cluster is None:
            return

        alloc_cpu, alloc_mem, used_cpu, used_mem = cluster

        dispatched = 0
        skipped = 0
        for job in jobs:
            tier = get_tier_resources(job.resource_tier)
            job_cpu = _parse_k8s_resource(tier["cpu_request"])
            job_mem = _parse_k8s_resource(tier["mem_request"])
            new_cpu = used_cpu + job_cpu
            new_mem = used_mem + job_mem

            if (alloc_cpu > 0 and (new_cpu / alloc_cpu) >= WORKERS_CAPACITY_THRESHOLD) or \
               (alloc_mem > 0 and (new_mem / alloc_mem) >= WORKERS_CAPACITY_THRESHOLD):
                skipped += 1
                continue

            try:
                _dispatch_single_job(job)
                used_cpu = new_cpu
                used_mem = new_mem
                dispatched += 1
            except Exception as e:
                logging.error("run_spider_jobs: failed to dispatch job %s: %s", job.jid, e)

        if dispatched or skipped:
            logging.info(
                "run_spider_jobs: dispatched %d, skipped %d (capacity %.0f%% CPU, %.0f%% MEM)",
                dispatched, skipped,
                (used_cpu / alloc_cpu) * 100 if alloc_cpu > 0 else 0,
                (used_mem / alloc_mem) * 100 if alloc_mem > 0 else 0,
            )

    finally:
        redis_client.delete(RUN_SPIDER_JOBS_LOCK_KEY)


def _dispatch_single_job(job):
    job_args = {arg.name: arg.value for arg in job.args.all()}
    job_env_vars = {env_var.name: env_var.value for env_var in job.env_vars.all()}

    proxy_name = job_env_vars.get("ESTELA_PROXY_NAME")
    if proxy_name:
        proxy_provider = ProxyProvider.objects.filter(name=proxy_name).first()
        if proxy_provider:
            proxy_env_vars = get_proxy_provider_envs(proxy_provider)
            job_env_vars.update(
                {env_var["name"]: env_var["value"] for env_var in proxy_env_vars}
            )

    collection = job.key
    unique = False
    if job.cronjob is not None and job.cronjob.unique_collection:
        collection = "scj{}".format(job.cronjob.key)
        unique = True

    token = get_default_token(job)

    job_manager.create_job(
        job.name,
        job.key,
        collection,
        job.spider.name,
        job_args,
        job_env_vars,
        job.spider.project.container_image,
        auth_token=token,
        unique=unique,
        resource_tier=job.resource_tier,
    )

    job.status = SpiderJob.WAITING_STATUS
    job.save()


def _get_cluster_resources():
    try:
        config.load_incluster_config()
        v1 = client.CoreV1Api()

        dedicated = settings.DEDICATED_SPIDER_NODES == "True"
        spider_node_role = settings.SPIDER_NODE_ROLE

        if dedicated:
            nodes = v1.list_node(label_selector=f"role={spider_node_role}")
        else:
            nodes = v1.list_node()

        if not nodes.items:
            logging.warning("No worker nodes found")
            return None

        total_allocatable_mem = 0
        total_allocatable_cpu = 0
        total_requested_mem = 0
        total_requested_cpu = 0

        for node in nodes.items:
            allocatable = node.status.allocatable or {}
            total_allocatable_mem += _parse_k8s_resource(allocatable.get("memory", "0"))
            total_allocatable_cpu += _parse_k8s_resource(allocatable.get("cpu", "0"))

            for phase in ("Running", "Pending"):
                pods = v1.list_pod_for_all_namespaces(
                    field_selector=f"spec.nodeName={node.metadata.name},status.phase={phase}"
                )
                for pod in pods.items:
                    for container in pod.spec.containers:
                        requests = (container.resources.requests or {}) if container.resources else {}
                        total_requested_mem += _parse_k8s_resource(requests.get("memory", "0"))
                        total_requested_cpu += _parse_k8s_resource(requests.get("cpu", "0"))

        pending_pods = v1.list_pod_for_all_namespaces(
            field_selector="status.phase=Pending"
        )
        for pod in pending_pods.items:
            if pod.spec.node_name:
                continue
            if dedicated:
                node_selector = pod.spec.node_selector or {}
                if node_selector.get("role") != spider_node_role:
                    continue
            for container in pod.spec.containers:
                requests = (container.resources.requests or {}) if container.resources else {}
                total_requested_mem += _parse_k8s_resource(requests.get("memory", "0"))
                total_requested_cpu += _parse_k8s_resource(requests.get("cpu", "0"))

        return (total_allocatable_cpu, total_allocatable_mem, total_requested_cpu, total_requested_mem)
    except Exception as e:
        logging.error("Failed to get cluster resources: %s", e)
        return None


def _parse_k8s_resource(value):
    value = str(value)
    if value.endswith("m"):
        return float(value[:-1]) / 1000
    if value.endswith("Ki"):
        return float(value[:-2]) * 1024
    if value.endswith("Mi"):
        return float(value[:-2]) * 1024 * 1024
    if value.endswith("Gi"):
        return float(value[:-2]) * 1024 * 1024 * 1024
    if value.endswith("Ti"):
        return float(value[:-2]) * 1024 * 1024 * 1024 * 1024
    if value.endswith("k"):
        return float(value[:-1]) * 1000
    if value.endswith("M"):
        return float(value[:-1]) * 1000 * 1000
    if value.endswith("G"):
        return float(value[:-1]) * 1000 * 1000 * 1000
    try:
        return float(value)
    except ValueError:
        return 0


def delete_data(pid, sid, jid, data_type):
    if not spiderdata_db_client.get_connection():
        return False
    job = SpiderJob.objects.get(jid=jid)
    if (
        job.cronjob is not None
        and job.cronjob.unique_collection
        and data_type == "items"
    ):
        job_collection_name = "{}-scj{}-job_{}".format(sid, job.cronjob.cjid, data_type)
    else:
        job_collection_name = "{}-{}-job_{}".format(sid, jid, data_type)

    spiderdata_db_client.delete_dataset_data(pid, job_collection_name)


@celery_app.task(name="core.tasks.launch_job")
def launch_job(sid_, data_, data_expiry_days=None, token=None):
    spider = Spider.objects.get(sid=sid_)

    if data_expiry_days is None:
        data_["data_status"] = DataStatus.PERSISTENT_STATUS
    else:
        data_["data_status"] = DataStatus.PENDING_STATUS

    resource_tier = data_.pop("resource_tier", None)

    serializer = SpiderJobCreateSerializer(data=data_)
    serializer.is_valid(raise_exception=True)

    save_kwargs = {
        "spider": spider,
        "status": SpiderJob.IN_QUEUE_STATUS,
        "data_expiry_days": data_expiry_days,
    }
    if resource_tier:
        save_kwargs["resource_tier"] = resource_tier

    serializer.save(**save_kwargs)


@celery_app.task(name="core.tasks.check_and_update_job_status_errors")
def check_and_update_job_status_errors():
    jobs = SpiderJob.objects.filter(status=SpiderJob.WAITING_STATUS)[
        : settings.CHECK_JOB_ERRORS_BATCH_SIZE
    ]

    for job in jobs:
        job_status = job_manager.read_job_status(job.name)
        if job_status is None or (
            job_status.active is None and job_status.succeeded is None
        ):
            try:
                update_stats_from_redis(job, save_to_database=True)
                delete_stats_from_redis(job)
            except:
                pass
            job.status = SpiderJob.ERROR_STATUS
            job.save()


@celery_app.task(
    max_retries=None,
    autoretry_for=(TaskError,),
    retry_kwargs={"max_retries": None, "countdown": 600},
)
def record_project_usage_after_data_delete(project_id, job_id):
    if not spiderdata_db_client.get_connection():
        raise TaskError("Could not get a connection to the database.")

    project = Project.objects.get(pid=project_id)
    items_data_size = spiderdata_db_client.get_database_size(str(project.pid), "items")
    requests_data_size = spiderdata_db_client.get_database_size(
        str(project.pid), "requests"
    )
    logs_data_size = spiderdata_db_client.get_database_size(str(project.pid), "logs")

    new_usage_record = UsageRecord.objects.filter(project=project).first()
    new_usage_record.pk = None
    new_usage_record._state.adding = True

    job = SpiderJob.objects.get(jid=job_id)
    new_usage_record.item_count -= job.item_count
    new_usage_record.request_count -= job.request_count

    job_item_data_size = new_usage_record.items_data_size - items_data_size
    job_request_data_size = new_usage_record.requests_data_size - requests_data_size
    job_logs_data_size = new_usage_record.logs_data_size - logs_data_size

    new_usage_record.items_data_size = items_data_size
    new_usage_record.requests_data_size = requests_data_size
    new_usage_record.logs_data_size = logs_data_size
    new_usage_record.save()

    return json.dumps(
        {
            "job_id": job_id,
            "job_item_data_size": job_item_data_size,
            "job_request_data_size": job_request_data_size,
            "job_logs_data_size": job_logs_data_size,
            "action": "delete",
        }
    )


@celery_app.task()
def delete_job_data(job_key):
    jid, sid, pid = job_key.split(".")
    for data_type in ["items", "requests", "logs"]:
        delete_data(pid, sid, jid, data_type)
    SpiderJob.objects.filter(jid=jid).update(data_status=DataStatus.DELETED_STATUS)
    record_project_usage_after_data_delete(pid, int(jid))


@celery_app.task(name="core.tasks.delete_expired_jobs_data")
def delete_expired_jobs_data():
    pending_data_delete_jobs = SpiderJob.objects.filter(
        data_status=DataStatus.PENDING_STATUS,
        status__in=[SpiderJob.COMPLETED_STATUS, SpiderJob.STOPPED_STATUS],
    )

    for job in pending_data_delete_jobs:
        if job.created < timezone.now() - timedelta(days=job.data_expiry_days):
            delete_job_data.s(job.key).delay()


@celery_app.task(
    max_retries=None,
    autoretry_for=(TaskError,),
    retry_kwargs={"max_retries": None, "countdown": 600},
)
def record_project_usage_after_job_event(job_id):
    if not spiderdata_db_client.get_connection():
        raise TaskError("Could not get a connection to the database.")

    job = SpiderJob.objects.get(jid=job_id)
    project = job.spider.project
    if job.cronjob is not None and job.cronjob.unique_collection:
        items_collection_name = "{}-scj{}-job_items".format(
            job.spider.sid, job.cronjob.cjid
        )
        items_data_size = spiderdata_db_client.get_database_size(
            str(project.pid), "items"
        )
        unique_collection = True
    else:
        items_collection_name = "{}-{}-job_items".format(job.spider.sid, job.jid)
        items_data_size = spiderdata_db_client.get_dataset_size(
            str(project.pid), items_collection_name
        )
        unique_collection = False
    requests_collection_name = "{}-{}-job_requests".format(job.spider.sid, job.jid)
    requests_data_size = spiderdata_db_client.get_dataset_size(
        str(project.pid), requests_collection_name
    )
    logs_collection_name = "{}-{}-job_logs".format(job.spider.sid, job.jid)
    logs_data_size = spiderdata_db_client.get_dataset_size(
        str(project.pid), logs_collection_name
    )
    # Tracking Proxy Usage
    proxy_details = {}
    for proxy_name, proxy_usage_name in settings.PROXY_PROVIDERS_TO_TRACK:
        proxy_usage_data = json.loads(job.proxy_usage_data)
        proxy_details.update(
            {
                proxy_usage_name: proxy_usage_data["bytes"]
                if proxy_name in proxy_usage_data.get("proxy_name")
                else 0,
            }
        )

    updated_values = {
        "processing_time": job.lifespan,
        "network_usage": job.total_response_bytes,
        "item_count": job.item_count,
        "request_count": job.request_count,
        "requests_data_size": requests_data_size,
        "logs_data_size": logs_data_size,
        **proxy_details,
    }
    last_usage_record = UsageRecord.objects.filter(project=project).first()
    if last_usage_record:
        for field in updated_values.keys():
            updated_values[field] += getattr(last_usage_record, field)
    else:
        last_usage_record = UsageRecord()
        last_usage_record.items_data_size = 0

    new_items_data_size = (
        items_data_size
        if unique_collection
        else last_usage_record.items_data_size + items_data_size
    )

    job_item_data_size = (
        items_data_size - last_usage_record.items_data_size
        if unique_collection
        else items_data_size
    )

    usage_record = UsageRecord.objects.create(
        project=project,
        items_data_size=new_items_data_size,
        **updated_values,
    )

    return json.dumps(
        {
            "spider_id": job.spider.sid,
            "job_id": job_id,
            "job_item_data_size": job_item_data_size,
            "job_request_data_size": requests_data_size,
            "job_logs_data_size": logs_data_size,
            "action": "add",
        }
    )


@celery_app.task(
    max_retries=None,
    autoretry_for=(TaskError,),
    retry_kwargs={"max_retries": None, "countdown": 60},
)
def record_job_coverage_event(job_id):
    if not spiderdata_db_client.get_connection():
        raise TaskError("Could not get a connection to the database.")
    job = SpiderJob.objects.get(jid=job_id)
    pid = job.spider.project.pid
    sid = job.spider.sid
    items_collection_name = f"{sid}-{job.jid}-job_items"
    items: List[dict] = spiderdata_db_client.get_all_dataset_data(
        str(pid), items_collection_name
    )
    total_items = len(items)
    if total_items > 0:
        coverage = {}
        field_counts = defaultdict(int)

        for item in items:
            for k, v in item.items():
                field_counts[k] += 1 if v is not None or v else 0

        for field, count in field_counts.items():
            coverage[f"{field}_field_count"] = count
            coverage[f"{field}_coverage"] = 100 * (count / total_items)

        scraped_fields_count = sum(field_counts.values())
        coverage["total_items"] = total_items
        coverage["total_items_coverage"] = 100 * (
            scraped_fields_count / (total_items * len(field_counts))
        )

        job_stats_id = f"{sid}-{job.jid}-job_stats"
        if not spiderdata_db_client.update_document(
            str(pid), "job_stats", job_stats_id, {"coverage": coverage}
        ):
            raise TaskError("Could not add the coverage stat to the job.")


def get_chain_to_process_usage_data(after_delete=False, project_id=None, job_id=None):
    list_of_process_functions = []
    for external_app in settings.DJANGO_EXTERNAL_APPS:
        module = __import__(f"{external_app}.tasks", fromlist=["tasks"])
        process_usage_data = getattr(module, "process_usage_data", None)
        if process_usage_data:
            list_of_process_functions.append(process_usage_data.s())

    if after_delete:
        process_chain = chain(
            record_project_usage_after_data_delete.s(project_id, job_id),
            *list_of_process_functions,
        )
    else:
        process_chain = chain(
            record_project_usage_after_job_event.s(job_id),
            *list_of_process_functions,
        )

    return process_chain


@celery_app.task(name="core.tasks.update_mongodb_insertion_progress")
def update_mongodb_insertion_progress():
    """
    Updates the database insertion progress for completed spider jobs.
    Tracks stalled jobs and excludes them after multiple cycles with no progress.
    """
    
    # Verify MongoDB connection
    if not spiderdata_db_client.get_connection():
        logging.error("Failed to connect to MongoDB - skipping progress updates")
        return
        
    # Process a batch of jobs
    batch_size = getattr(settings, 'UPDATE_MONGODB_INSERTION_BATCH_SIZE', 100)
    stall_threshold = getattr(settings, 'MONGODB_MAX_STALLED_CYCLES', 100)
    redis_client = redis.from_url(settings.REDIS_URL)
    
    jobs = SpiderJob.objects.filter(
        status=SpiderJob.COMPLETED_STATUS, 
        database_insertion_progress__lt=100,
        exclude_from_insertion_updates=False
    ).order_by('created')[:batch_size]
    
    job_count = jobs.count()
    if job_count == 0:
        return
        
    logging.info(f"Processing {job_count} jobs for MongoDB insertion progress")
    
    for job in jobs:
        stall_key = f"estela:stalled:{job.jid}"
        
        # Handle zero-item jobs
        if job.item_count == 0:
            SpiderJob.objects.filter(pk=job.pk).update(database_insertion_progress=100)
            continue
            
        try:
            # Get MongoDB document count
            collection = f"{job.spider.sid}-{job.jid}-job_items"
            count = spiderdata_db_client.get_estimated_item_count(
                str(job.spider.project.pid), collection
            )
            
            # Calculate progress
            new_progress = min(100, (count / job.item_count) * 100)
            progress_changed = abs(new_progress - job.database_insertion_progress) > 0.1
            
            if progress_changed:
                # Progress changed - update DB and reset stall counter
                SpiderJob.objects.filter(pk=job.pk).update(database_insertion_progress=new_progress)
                redis_client.delete(stall_key)
            else:
                # Progress stalled - increment counter
                stall_count = redis_client.incr(stall_key)
                
                # Exclude job if stalled too long
                if stall_count >= stall_threshold:
                    SpiderJob.objects.filter(pk=job.pk).update(exclude_from_insertion_updates=True)
                    redis_client.delete(stall_key)
                    logging.info(f"Job {job.jid} excluded after {stall_count} cycles with no progress")
        except Exception as e:
            logging.error(f"Error updating progress for job {job.jid}: {str(e)}")
            
    logging.info(f"Completed MongoDB insertion progress updates")
