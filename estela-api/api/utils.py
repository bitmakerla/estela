import json
from datetime import timedelta
from typing import Any, Dict, Optional, Tuple

from django.conf import settings
import redis

from api import errors
from api.exceptions import DataBaseError
from config.job_manager import spiderdata_db_client
from core.models import SpiderJobEnvVar


def update_env_vars(instance, env_vars, level="project", delete=True):
    env_vars_instance = instance.env_vars.all()
    for env_var in env_vars:
        if env_vars_instance.filter(**env_var).exists():
            continue
        elif env_var["masked"] is True and env_var["value"] == "__MASKED__":
            continue
        elif env_var["masked"] is False and env_var["value"] == "__MASKED__":
            env_vars_instance.filter(name=env_var["name"]).update(masked=False)
        elif env_var["name"] in [value.name for value in env_vars_instance]:
            env_vars_instance.filter(name=env_var["name"]).update(
                value=env_var["value"],
                masked=env_var["masked"],
            )
        else:
            if level == "project":
                SpiderJobEnvVar.objects.create(project=instance, **env_var)
            elif level == "spider":
                SpiderJobEnvVar.objects.create(spider=instance, **env_var)

    if delete:
        for env_var in env_vars_instance:
            if env_var.name not in [value["name"] for value in env_vars]:
                env_var.delete()


def update_stats_from_redis(job, save_to_database=False):
    redis_conn = redis.from_url(settings.REDIS_URL)
    job_stats = redis_conn.hgetall(f"scrapy_stats_{job.key}")
    job_stats = {key.decode(): value.decode() for key, value in job_stats.items()}

    job.lifespan = timedelta(
        seconds=int(float(job_stats.get("elapsed_time_seconds", "0")))
    )
    job.total_response_bytes = int(job_stats.get("downloader/response_bytes", "0"))
    job.item_count = int(job_stats.get("item_scraped_count", "0"))
    job.request_count = int(job_stats.get("downloader/request_count", "0"))

    if save_to_database and job_stats:
        if not spiderdata_db_client.get_connection():
            raise DataBaseError({"error": errors.UNABLE_CONNECT_DB})

        for key, value in job_stats.items():
            if value.isdigit():
                job_stats[key] = int(value)
            else:
                try:
                    job_stats[key] = float(value)
                except ValueError:
                    pass

        job_collection_name = "{}-{}-job_stats".format(job.spider.sid, job.jid)
        job_stats["_id"] = job_collection_name
        spiderdata_db_client.insert_one_to_dataset(
            str(job.spider.project.pid), "job_stats", job_stats
        )


def delete_stats_from_redis(job):
    redis_conn = redis.from_url(settings.REDIS_URL)
    try:
        redis_conn.delete(f"scrapy_stats_{job.key}")
    except:
        pass


def _coerce_int_stat(job_stats: Dict[str, str], key: str, default: int = 0) -> int:
    raw = job_stats.get(key)
    if raw is None or raw == "":
        return default
    try:
        return int(float(raw))
    except (TypeError, ValueError):
        return default


def _first_int_stat(job_stats: Dict[str, str], keys: tuple, default: int = 0) -> int:
    for key in keys:
        if key in job_stats:
            return _coerce_int_stat(job_stats, key, default)
    return default


def _coerce_float_stat(job_stats: Dict[str, str], key: str, default: float = 0.0) -> float:
    raw = job_stats.get(key)
    if raw is None or raw == "":
        return default
    try:
        return float(raw)
    except (TypeError, ValueError):
        return default


# Scrapy extension may publish corpus sizes under these stats keys (first match wins).
STAT_ITEMS_DATA_SIZE_KEYS = ("items_data_size", "estela/items_data_size")
STAT_REQUESTS_DATA_SIZE_KEYS = ("requests_data_size", "estela/requests_data_size")
STAT_LOGS_DATA_SIZE_KEYS = ("logs_data_size", "estela/logs_data_size")

# Preferred cumulative object byte sizes (items / requests / logs corpora).
STAT_ITEM_OBJ_BYTE_SIZE_KEYS = ("item_obj_byte_size", "estela/item_obj_byte_size")
STAT_REQUEST_OBJ_BYTE_SIZE_KEYS = (
    "request_obj_byte_size",
    "estela/request_obj_byte_size",
)
STAT_LOG_OBJ_BYTE_SIZE_KEYS = ("log_obj_byte_size", "estela/log_obj_byte_size")

# Scrapy cumulative proxy response bytes (Redis hash on scrapy_stats_*).
SCRAPY_STAT_PROXY_RESPONSE_BYTES = "downloader/proxies/response_bytes"


def _corpus_bytes_prefer_obj_keys(
    job_stats: Dict[str, str],
    obj_keys: tuple,
    legacy_keys: tuple,
) -> int:
    """Use *obj* Redis stats when present; otherwise legacy *data_size* keys."""
    for k in obj_keys:
        if k in job_stats:
            return _coerce_int_stat(job_stats, k, 0)
    return _first_int_stat(job_stats, legacy_keys, 0)


def storage_obj_bytes_total_from_redis_hash(job_stats: Dict[str, str]) -> int:
    """Sum of items + requests + logs object byte sizes from a Scrapy Redis stats hash."""
    items_b = _corpus_bytes_prefer_obj_keys(
        job_stats, STAT_ITEM_OBJ_BYTE_SIZE_KEYS, STAT_ITEMS_DATA_SIZE_KEYS
    )
    req_b = _corpus_bytes_prefer_obj_keys(
        job_stats, STAT_REQUEST_OBJ_BYTE_SIZE_KEYS, STAT_REQUESTS_DATA_SIZE_KEYS
    )
    log_b = _corpus_bytes_prefer_obj_keys(
        job_stats, STAT_LOG_OBJ_BYTE_SIZE_KEYS, STAT_LOGS_DATA_SIZE_KEYS
    )
    return int(items_b) + int(req_b) + int(log_b)


def parse_scrapy_stats_redis_hash(job_stats: Dict[str, str]) -> Dict[str, Any]:
    """
    Normalize decoded Redis hash entries from scrapy_stats_* into metering-friendly counters.

    Preferred ``*_obj_byte_size`` keys and legacy ``*_data_size`` keys are consulted
    only when computing ``storage_obj_bytes_total`` (see
    :func:`storage_obj_bytes_total_from_redis_hash`).
    """
    elapsed = _coerce_float_stat(job_stats, "elapsed_time_seconds", 0.0)
    meter_proxy_redis_bytes = _coerce_int_stat(
        job_stats, SCRAPY_STAT_PROXY_RESPONSE_BYTES, 0
    )
    return {
        "elapsed_time_seconds": elapsed,
        "total_response_bytes": _first_int_stat(
            job_stats, ("downloader/response_bytes",), 0
        ),
        "item_count": _first_int_stat(job_stats, ("item_scraped_count",), 0),
        "request_count": _first_int_stat(job_stats, ("downloader/request_count",), 0),
        "storage_obj_bytes_total": storage_obj_bytes_total_from_redis_hash(job_stats),
        "meter_proxy_redis_bytes": meter_proxy_redis_bytes,
    }


def read_scrapy_counters_from_redis(job) -> Optional[Dict[str, Any]]:
    """
    Read cumulative Scrapy counters from Redis without mutating *job*.

    Includes elapsed wall-clock seconds (elapsed_time_seconds), bandwidth
    (downloader/response_bytes), Scrapy items/requests counts, optional corpus object
    byte sizes (``item_obj_byte_size`` / ``request_obj_byte_size`` / ``log_obj_byte_size``
    and ``estela/*`` variants, with legacy size keys folded into
    ``storage_obj_bytes_total``, and proxy bytes from Redis via
    ``meter_proxy_redis_bytes`` (cumulative ``downloader/proxies/response_bytes``).

    Returns None if there are no stats for this job key.
    """
    redis_conn = redis.from_url(settings.REDIS_URL)
    raw = redis_conn.hgetall(f"scrapy_stats_{job.key}")
    if not raw:
        return None
    job_stats = {key.decode(): value.decode() for key, value in raw.items()}
    return parse_scrapy_stats_redis_hash(job_stats)


# Hourly metering baseline for DELTA_SLICE diffs; cleared on job close (see ledger).
METER_HOURLY_LAST_SAMPLE_KEY = "estela:meter:last_sample:{}"


def delete_hourly_meter_last_sample_from_redis(job) -> None:
    """Drop last-sample key after JOB_CLOSE / hourly reconcile MeteredUsageRecord is written."""
    redis_conn = redis.from_url(settings.REDIS_URL)
    try:
        redis_conn.delete(METER_HOURLY_LAST_SAMPLE_KEY.format(job.key))
    except:
        pass


def metered_proxy_name_from_job(job) -> str:
    """Denormalize ``SpiderJob.proxy_usage_data['proxy_name']`` onto meter rows (survives job FK nulling).

    Reads ``proxy_usage_data`` from the given *job* instance only (no DB round-trip).
    For a value guaranteed to match the database after concurrent updates, refresh that
    field on *job* before calling.
    """
    raw = getattr(job, "proxy_usage_data", None)
    if raw is None:
        return ""
    if isinstance(raw, str):
        try:
            payload = dict(json.loads(raw))
        except (TypeError, ValueError, json.JSONDecodeError):
            return ""
    elif isinstance(raw, dict):
        payload = raw
    else:
        return ""
    val = payload.get("proxy_name")
    if val is None or val == "":
        return ""
    s = str(val).strip()
    return s[:512] if len(s) > 512 else s


def get_proxy_provider_envs(proxy_provider):
    proxy_attrs = [
        "username",
        "password",
        "host",
        "port",
        "name",
    ]
    fields_and_values = vars(proxy_provider)
    replaces = {
        "password": "pass",
        "host": "url",
        "username": "user",
    }
    env_vars = []
    for field, value in fields_and_values.items():
        if field in proxy_attrs:
            name = replaces.get(field, field).upper()
            if name != "NAME":
                masked = True
            else:
                masked = False
            env_vars.append(
                {"name": f"ESTELA_PROXY_{name}", "value": value, "masked": masked}
            )
    env_vars.append(
        {
            "name": "ESTELA_PROXIES_ENABLED",
            "value": "True",
            "masked": False,
        }
    )
    return env_vars


def get_collection_name(job, data_type):
    if (
        job.cronjob is not None
        and job.cronjob.unique_collection
        and data_type == "items"
    ):
        job_collection_name = "{}-scj{}-job_{}".format(
            job.spider.sid, job.cronjob.cjid, data_type
        )
    else:
        job_collection_name = "{}-{}-job_{}".format(
            job.spider.sid, job.jid, data_type
        )

    return job_collection_name


def get_job_spiderdata_corpus_sizes_bytes(job) -> Optional[Tuple[int, int, int]]:
    """
    Return ``(items_data_size, requests_data_size, logs_data_size)`` from spiderdata.

    Matches ``record_project_usage_after_job_event``: per-job datasets for requests
    and logs; items use the project-wide ``items`` database when the job uses a
    cron unique collection, otherwise the per-job items dataset.
    """
    if not spiderdata_db_client.get_connection():
        return None
    pid = str(job.spider.project.pid)
    if job.cronjob is not None and job.cronjob.unique_collection:
        items_size = int(spiderdata_db_client.get_database_size(pid, "items"))
    else:
        items_size = int(
            spiderdata_db_client.get_dataset_size(pid, get_collection_name(job, "items"))
        )
    requests_size = int(
        spiderdata_db_client.get_dataset_size(
            pid, get_collection_name(job, "requests")
        )
    )
    logs_size = int(
        spiderdata_db_client.get_dataset_size(pid, get_collection_name(job, "logs"))
    )
    return (items_size, requests_size, logs_size)
