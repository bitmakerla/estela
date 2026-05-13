"""Append-only MeteredUsageRecord writes with idempotency.

This module owns writes for **flow** rows: ``DELTA_SLICE`` is written by
:mod:`core.metering.hourly` (including ``delta_storage_bytes`` from Redis
object-byte stats); ``JOB_CLOSE`` and ``ADJUSTMENT`` are written here;
``DATA_DELETE`` is an audit marker also written here.
"""

from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timedelta, timezone as dt_timezone
from decimal import Decimal
from typing import Any, Optional, Tuple

from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import Max, Sum
from django.utils import timezone

from api.utils import (
    delete_hourly_meter_last_sample_from_redis,
    metered_proxy_name_from_job,
)
from core.models import MeteredUsageRecord, SpiderJob

logger = logging.getLogger(__name__)


def _utc_hour_floor_for_idempotency(dt: datetime) -> datetime:
    """UTC hour start for ``DATA_DELETE`` idempotency key only (not a billing field)."""
    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt, dt_timezone.utc)
    dt = dt.astimezone(dt_timezone.utc)
    return dt.replace(minute=0, second=0, microsecond=0)

# Half-open ``[t, t + EPS)`` for JOB_CLOSE / ADJUSTMENT / DATA_DELETE (point-in-time facts).
_EVENT_INTERVAL_EPSILON = timedelta(microseconds=1)


def _event_point_interval(anchor: datetime) -> Tuple[datetime, datetime]:
    return anchor, anchor + _EVENT_INTERVAL_EPSILON


def max_interval_end_from_delta_slices(job_id: int) -> Optional[datetime]:
    """Latest ``interval_end`` among DELTA_SLICE rows for the job, if any."""
    return (
        MeteredUsageRecord.objects.filter(
            job_id=job_id,
            kind=MeteredUsageRecord.Kind.DELTA_SLICE,
            interval_end__isnull=False,
        ).aggregate(m=Max("interval_end"))
    ).get("m")


def sum_delta_slice_totals_for_job(job_id: int) -> dict:
    """Sum flow dimensions from DELTA_SLICE rows for *job_id* (including ``delta_storage_bytes``)."""
    qs = MeteredUsageRecord.objects.filter(
        job_id=job_id,
        kind=MeteredUsageRecord.Kind.DELTA_SLICE,
    )
    agg = qs.aggregate(
        net=Sum("delta_network_bytes"),
        req=Sum("delta_request_count"),
        item=Sum("delta_item_count"),
        rt=Sum("delta_runtime_seconds"),
        proxy=Sum("delta_proxy_bytes"),
        storage=Sum("delta_storage_bytes"),
    )
    rt_val = agg["rt"]
    runtime_seconds = (
        Decimal(str(rt_val)) if rt_val is not None else Decimal("0")
    )
    return {
        "network": int(agg["net"] or 0),
        "request_count": int(agg["req"] or 0),
        "item_count": int(agg["item"] or 0),
        "runtime_seconds": runtime_seconds,
        "proxy": int(agg["proxy"] or 0),
        "storage_bytes": int(agg["storage"] or 0),
    }


def delta_proxy_bytes_for_flow_row(proxy_name_label: str, delta: int) -> Optional[int]:
    """Persist ``delta_proxy_bytes`` consistent with the model help text.

    When ``proxy_name`` applies (non-empty label), store the signed delta including ``0``.
    When it does not apply and the delta is zero, store NULL. Non-zero deltas without a
    configured proxy name are still stored so legacy or mis-labeled runs do not drop bytes.
    """
    if proxy_name_label:
        return int(delta)
    return None if delta == 0 else int(delta)


def create_metered_usage_idempotent(**fields: Any) -> Optional[MeteredUsageRecord]:
    """Insert one row; on duplicate idempotency_key log and return None."""
    try:
        with transaction.atomic():
            return MeteredUsageRecord.objects.create(**fields)
    except IntegrityError:
        key = fields.get("idempotency_key")
        logger.info("Skipped duplicate MeteredUsageRecord idempotency_key=%s", key)
        return None


def append_metered_usage_for_job_close(job: SpiderJob, project) -> None:
    """Emit the close-time ledger entry for *job*'s flow dimensions.

    ``JOB_CLOSE`` / ``ADJUSTMENT`` rows set ``interval_start`` / ``interval_end`` to a
    minimal half-open slice ``[t, t + 1 microsecond)``: ``t`` is close time, or the latest
    ``DELTA_SLICE.interval_end`` when reconciling under hourly metering.
    """
    runtime_sec = Decimal(str(job.lifespan.total_seconds()))
    hourly_on = getattr(settings, "METERED_USAGE_HOURLY_ENABLED", False)
    # Import inside: tests patch ``api.utils.read_scrapy_counters_from_redis``.
    from api.utils import read_scrapy_counters_from_redis

    raw = read_scrapy_counters_from_redis(job) or {}
    storage_final = int(raw.get("storage_obj_bytes_total", 0))
    proxy_cumulative = int(raw.get("meter_proxy_redis_bytes", 0))
    proxy_name_label = metered_proxy_name_from_job(job)

    if not hourly_on:
        close_instant = timezone.now()
        iv_start, iv_end = _event_point_interval(close_instant)
        create_metered_usage_idempotent(
            idempotency_key=f"job:{job.jid}:close:v3",
            project=project,
            job=job,
            spider=job.spider,
            cronjob=job.cronjob,
            interval_start=iv_start,
            interval_end=iv_end,
            source_ref=f"spider_job:{job.jid}",
            proxy_name=proxy_name_label,
            delta_network_bytes=int(job.total_response_bytes),
            delta_request_count=int(job.request_count),
            delta_item_count=int(job.item_count),
            delta_storage_bytes=storage_final,
            delta_proxy_bytes=delta_proxy_bytes_for_flow_row(
                proxy_name_label,
                proxy_cumulative,
            ),
            delta_runtime_seconds=runtime_sec,
            kind=MeteredUsageRecord.Kind.JOB_CLOSE,
        )
        delete_hourly_meter_last_sample_from_redis(job)
        return

    slice_end = max_interval_end_from_delta_slices(job.pk)
    anchor = slice_end if slice_end is not None else timezone.now()
    iv_start, iv_end = _event_point_interval(anchor)

    sums = sum_delta_slice_totals_for_job(job.jid)
    adj_net = int(job.total_response_bytes) - sums["network"]
    adj_req = int(job.request_count) - sums["request_count"]
    adj_item = int(job.item_count) - sums["item_count"]
    adj_runtime = runtime_sec - sums["runtime_seconds"]
    slice_proxy_total = int(sums["proxy"])
    adj_proxy_diff = proxy_cumulative - slice_proxy_total
    adj_storage = storage_final - sums["storage_bytes"]

    delete_hourly_meter_last_sample_from_redis(job)

    if not (adj_net or adj_req or adj_item or adj_runtime or adj_proxy_diff or adj_storage):
        return

    scrapy_flow_residual = bool(adj_net or adj_req or adj_item or adj_runtime or adj_proxy_diff)
    adjustment_reason = (
        MeteredUsageRecord.AdjustmentReason.RECONCILE_SCRAPY_FINAL
        if scrapy_flow_residual
        else MeteredUsageRecord.AdjustmentReason.RECONCILE_STORAGE
    )

    create_metered_usage_idempotent(
        idempotency_key=f"job:{job.jid}:close:reconcile:v3",
        project=project,
        job=job,
        spider=job.spider,
        cronjob=job.cronjob,
        interval_start=iv_start,
        interval_end=iv_end,
        source_ref=f"spider_job:{job.jid}",
        proxy_name=proxy_name_label,
        delta_network_bytes=adj_net,
        delta_request_count=adj_req,
        delta_item_count=adj_item,
        delta_storage_bytes=adj_storage,
        delta_proxy_bytes=delta_proxy_bytes_for_flow_row(
            proxy_name_label,
            adj_proxy_diff,
        ),
        delta_runtime_seconds=adj_runtime if adj_runtime else None,
        kind=MeteredUsageRecord.Kind.ADJUSTMENT,
        adjustment_reason=adjustment_reason,
    )


def append_metered_usage_for_data_delete(job: SpiderJob, project) -> None:
    """Audit marker for spider-job data deletion. Carries no flow deltas."""
    delete_instant = timezone.now()
    hour_floor = _utc_hour_floor_for_idempotency(delete_instant)

    state = ":".join(str(x) for x in (job.jid, hour_floor.isoformat()))
    h = hashlib.sha256(state.encode()).hexdigest()[:24]

    iv_start, iv_end = _event_point_interval(delete_instant)

    proxy_name_label = metered_proxy_name_from_job(job)
    create_metered_usage_idempotent(
        idempotency_key=f"job:{job.jid}:data_delete:{h}:v2",
        project=project,
        job=job,
        spider=job.spider,
        cronjob=job.cronjob,
        interval_start=iv_start,
        interval_end=iv_end,
        proxy_name=proxy_name_label,
        delta_network_bytes=0,
        delta_request_count=0,
        delta_item_count=0,
        delta_proxy_bytes=None,
        delta_runtime_seconds=None,
        kind=MeteredUsageRecord.Kind.DATA_DELETE,
        source_ref=f"spider_job:{job.jid}",
    )
