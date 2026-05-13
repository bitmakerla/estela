"""Periodic DELTA_SLICE flow metering from Redis Scrapy stats.

Each successful sample writes **one** append-only row: the Redis counter delta over
the real half-open interval ``[interval_start, interval_end)``. No UTC-hour
splitting is applied at write time; consumers may bucket for display or billing.

Job close (:mod:`core.metering.ledger`) still reconciles finals vs ``SUM`` of
these slice rows when hourly metering is enabled.
"""

from __future__ import annotations

import json
import logging
from datetime import timezone as py_timezone
from decimal import Decimal

import redis
from django.conf import settings
from django.utils import dateparse
from django.utils import timezone

from api.utils import (
    METER_HOURLY_LAST_SAMPLE_KEY,
    metered_proxy_name_from_job,
    read_scrapy_counters_from_redis,
)
from core.metering.ledger import (
    create_metered_usage_idempotent,
    delta_proxy_bytes_for_flow_row,
)
from core.models import MeteredUsageRecord, SpiderJob


logger = logging.getLogger(__name__)

_CLIENT = None


def _redis():
    global _CLIENT
    if _CLIENT is None:
        _CLIENT = redis.from_url(settings.REDIS_URL)
    return _CLIENT


def _synthetic_zero_prev_snapshot(job: SpiderJob, now) -> dict:
    """Baseline for first Redis read: counters at zero from ``job.created`` (UTC)."""
    created = job.created
    if timezone.is_naive(created):
        created = timezone.make_aware(created, py_timezone.utc)
    else:
        created = created.astimezone(py_timezone.utc)
    if created > now:
        created = now
    return {
        "observed_at": created.isoformat(),
        "elapsed_time_seconds": 0.0,
        "total_response_bytes": 0,
        "item_count": 0,
        "request_count": 0,
        "meter_proxy_redis_bytes": 0,
        "storage_obj_bytes_total": 0,
    }


def _meter_proxy_redis_cumulative_from_sample(sample: dict) -> int:
    """Cumulative proxy bytes from a stored Redis meter sample (legacy dict shapes supported)."""
    if "meter_proxy_redis_bytes" in sample:
        return int(sample["meter_proxy_redis_bytes"])
    legacy = sample.get("meter_proxy_from_redis")
    if isinstance(legacy, dict):
        return sum(int(v) for v in legacy.values())
    legacy_b = sample.get("proxy_bytes")
    if isinstance(legacy_b, dict):
        return sum(int(v) for v in legacy_b.values())
    return 0


def process_hourly_metered_usage_for_job(job: SpiderJob) -> None:
    raw_stats = read_scrapy_counters_from_redis(job)
    if raw_stats is None:
        return

    now = timezone.now()
    r = _redis()
    key = METER_HOURLY_LAST_SAMPLE_KEY.format(job.key)
    prev_raw = r.get(key)
    meter_proxy_redis_bytes = raw_stats["meter_proxy_redis_bytes"]
    storage_obj_bytes_total = int(raw_stats.get("storage_obj_bytes_total", 0))
    payload = {
        "observed_at": now.isoformat(),
        "elapsed_time_seconds": raw_stats["elapsed_time_seconds"],
        "total_response_bytes": raw_stats["total_response_bytes"],
        "item_count": raw_stats["item_count"],
        "request_count": raw_stats["request_count"],
        "meter_proxy_redis_bytes": meter_proxy_redis_bytes,
        "storage_obj_bytes_total": storage_obj_bytes_total,
    }
    if prev_raw is None:
        prev = _synthetic_zero_prev_snapshot(job, now)
    else:
        prev = json.loads(prev_raw.decode() if isinstance(prev_raw, bytes) else prev_raw)

    t0 = dateparse.parse_datetime(prev["observed_at"])
    if t0 is None:
        r.set(key, json.dumps(payload))
        return
    if timezone.is_naive(t0):
        t0 = timezone.make_aware(t0, py_timezone.utc)
    else:
        t0 = t0.astimezone(py_timezone.utc)
    t1 = now
    if t0 >= t1:
        r.set(key, json.dumps(payload))
        return

    dn = int(raw_stats["total_response_bytes"]) - int(prev.get("total_response_bytes", 0))
    di = int(raw_stats["item_count"]) - int(prev.get("item_count", 0))
    dr = int(raw_stats["request_count"]) - int(prev.get("request_count", 0))

    dn = max(0, dn)
    di = max(0, di)
    dr = max(0, dr)

    de = float(raw_stats["elapsed_time_seconds"]) - float(
        prev.get("elapsed_time_seconds", 0.0)
    )
    d_elapsed_int = max(0, int(round(de)))

    proxy_prev_total = _meter_proxy_redis_cumulative_from_sample(prev)
    proxy_cur_total = meter_proxy_redis_bytes
    d_proxy = max(0, proxy_cur_total - proxy_prev_total)

    storage_prev_total = int(prev.get("storage_obj_bytes_total", 0))
    # Signed diff (unlike network/items/requests): stored object bytes can shrink.
    d_storage = storage_obj_bytes_total - storage_prev_total

    if dn == 0 and di == 0 and dr == 0 and d_elapsed_int == 0 and d_proxy == 0 and d_storage == 0:
        r.set(key, json.dumps(payload))
        return

    slice_key = f"job:{job.jid}:sample:{t0.isoformat()}:{t1.isoformat()}:v5"
    project = job.spider.project
    spider = job.spider
    cronjob = job.cronjob
    proxy_name_label = metered_proxy_name_from_job(job)
    create_metered_usage_idempotent(
        idempotency_key=slice_key,
        project=project,
        job=job,
        spider=spider,
        cronjob=cronjob,
        interval_start=t0,
        interval_end=t1,
        proxy_name=proxy_name_label,
        delta_network_bytes=dn,
        delta_request_count=dr,
        delta_item_count=di,
        delta_storage_bytes=d_storage,
        delta_proxy_bytes=delta_proxy_bytes_for_flow_row(proxy_name_label, d_proxy),
        delta_runtime_seconds=Decimal(str(d_elapsed_int)) if d_elapsed_int else None,
        kind=MeteredUsageRecord.Kind.DELTA_SLICE,
        source_ref=f"spider_job:{job.jid}",
    )

    r.set(key, json.dumps(payload))


def record_hourly_metered_usage_batch() -> None:
    if not getattr(settings, "METERED_USAGE_HOURLY_ENABLED", False):
        return
    max_jobs = getattr(settings, "METERED_USAGE_HOURLY_MAX_JOBS", 2000)
    qs = (
        SpiderJob.objects.filter(status=SpiderJob.RUNNING_STATUS)
        .select_related("spider__project", "cronjob")
        .order_by("jid")[:max_jobs]
    )
    for job in qs:
        try:
            process_hourly_metered_usage_for_job(job)
        except Exception:
            logger.exception("hourly meter failed for job %s", job.jid)
