import json
from collections import defaultdict
from datetime import timedelta, datetime, timezone
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

import redis

def get_default_token(job):
    """
    Retrieves or creates an authentication token for the first user
    associated with the given job's spider project.

    Args:
        job (SpiderJob): The job for which to get the user's token.

    Returns:
        str: The token key for the first user, or None if no user is found.
    """
    user = job.spider.project.users.first()
    if not user:
        return None
    token, _ = Token.objects.get_or_create(user=user)
    return token.key


@celery_app.task
def run_spider_jobs():
    """
    Task to run spider jobs that are in the IN_QUEUE_STATUS.
    Selects jobs from the queue and updates their status to WAITING_STATUS.
    Initializes job execution using the job manager.
    """
    jobs = SpiderJob.objects.filter(status=SpiderJob.IN_QUEUE_STATUS)[
        : settings.RUN_JOBS_PER_LOT
    ]

    for job in jobs:
        job_args = {arg.name: arg.value for arg in job.args.all()}
        job_env_vars = {env_var.name: env_var.value for env_var in job.env_vars.all()}
        job.status = SpiderJob.WAITING_STATUS
        job.save()
        job_manager.create_job(
            job.name,
            job.key,
            job.key,
            job.spider.name,
            job_args,
            job_env_vars,
            job.spider.project.container_image,
            auth_token=get_default_token(job),
        )


def delete_data(pid, sid, jid, data_type):
    """
    Deletes specific data (items, requests, logs) associated with a job.

    Args:
        pid (str): Project ID.
        sid (str): Spider ID.
        jid (str): Job ID.
        data_type (str): The type of data to delete ('items', 'requests', 'logs').

    Returns:
        bool: False if connection to spiderdata_db_client cannot be established.
    """
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
    """
    Task to launch a spider job with the provided data and optional token.
    Creates a job using SpiderJobCreateSerializer and passes the job to the job manager.

    Args:
        sid_ (int): Spider ID.
        data_ (dict): Job data to be serialized and saved.
        data_expiry_days (int, optional): Number of days before data expiry.
        token (str, optional): Authentication token. If not provided, a default token is used.
    """
    spider = Spider.objects.get(sid=sid_)

    if data_expiry_days is None:
        data_["data_status"] = DataStatus.PERSISTENT_STATUS
    else:
        data_["data_status"] = DataStatus.PENDING_STATUS

    serializer = SpiderJobCreateSerializer(data=data_)
    serializer.is_valid(raise_exception=True)
    job = serializer.save(spider=spider, data_expiry_days=data_expiry_days)

    collection = job.key

    if job.cronjob.unique_collection:
        collection = "scj{}".format(job.cronjob.key)

    if token is None:
        token = get_default_token(job)

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

    job_manager.create_job(
        job.name,
        job.key,
        collection,
        job.spider.name,
        job_args,
        job_env_vars,
        job.spider.project.container_image,
        auth_token=token,
        unique=job.cronjob.unique_collection,
    )


@celery_app.task(name="core.tasks.check_and_update_job_status_errors")
def check_and_update_job_status_errors():
    """
    Task to check jobs with WAITING_STATUS and update their status to ERROR_STATUS
    if no active or succeeded status is detected. Also updates job stats from Redis
    and deletes Redis stats if applicable.
    """
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
    """
    Task to record the project usage statistics after deleting job data.
    Calculates the new usage records based on database size after data deletion.

    Args:
        project_id (int): The project ID.
        job_id (int): The job ID.

    Raises:
        TaskError: If the connection to spiderdata_db_client cannot be established.

    Returns:
        str: JSON string with job data size and usage details.
    """
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
    """
    Task to delete all job-related data including items, requests, and logs.
    Updates job data status to DELETED_STATUS after deletion.
    Calculates a new usage record after data deletion.

    Args:
        job_key (str): Unique identifier for the job, typically in the format "jid.sid.pid".
    """
    jid, sid, pid = job_key.split(".")
    for data_type in ["items", "requests", "logs"]:
        delete_data(pid, sid, jid, data_type)
    SpiderJob.objects.filter(jid=jid).update(data_status=DataStatus.DELETED_STATUS)
    record_project_usage_after_data_delete(pid, int(jid))


@celery_app.task(name="core.tasks.delete_expired_jobs_data")
def delete_expired_jobs_data():
    """
    Task to delete job data for jobs that have passed their data expiry date.
    This checks jobs with a PENDING_STATUS and triggers deletion if expiry is met.
    """
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
    """
    Task to record the project usage statistics after a job event (e.g., job completion).
    Calculates new usage records based on the job data and updates the project usage records.

    Args:
        job_id (int): The job ID.

    Raises:
        TaskError: If the connection to spiderdata_db_client cannot be established.

    Returns:
        str: JSON string with job data size and usage details.
    """
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
    """
    Task to record job field coverage statistics after a job event.
    Collects data on field coverage and updates the job's statistics document in the database.

    Args:
        job_id (int): The job ID.

    Raises:
        TaskError: If the connection to spiderdata_db_client cannot be established.
    """
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
    """
    Generates a Celery chain to process usage data after a job event or data deletion.
    This function dynamically imports tasks from external apps specified in settings and chains
    them together with either record_project_usage_after_data_delete or record_project_usage_after_job_event.

    Args:
        after_delete (bool): If True, processes usage data after a data deletion event.
        project_id (int, optional): Project ID for the data deletion event.
        job_id (int, optional): Job ID for the job event or data deletion.

    Returns:
        Celery chain: A chain of tasks to be executed sequentially.
    """
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
