"""Append-only MeteredUsageRecord writes with idempotency.

Estela-owned scrape flow (network, items, requests, storage, runtime) only.
Proxy usage is reported by external services (e.g. bitmaker-proxy).
"""

from __future__ import annotations

import hashlib
from datetime import datetime, timedelta, timezone as dt_timezone
from decimal import Decimal
from typing import Optional, Tuple
from uuid import UUID

from django.conf import settings
from django.db.models import Max
from django.utils import timezone

from api.utils import delete_hourly_meter_last_sample_from_redis
from core.metering.metrics import (
    REPORTER_ESTELA,
    RESOURCE_KIND_SPIDER_JOB,
    build_flow_metrics,
    sum_estela_flow_metrics,
)
from core.metering.report import append_metered_usage, create_metered_usage_idempotent
from core.models import MeteredUsageRecord, SpiderJob

__all__ = [
    "append_metered_usage_for_data_delete",
    "append_metered_usage_for_job_close",
    "create_metered_usage_idempotent",
    "max_interval_end_for_resource",
    "sum_slice_metrics_for_resource",
]


def _utc_hour_floor_for_idempotency(dt: datetime) -> datetime:
    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt, dt_timezone.utc)
    dt = dt.astimezone(dt_timezone.utc)
    return dt.replace(minute=0, second=0, microsecond=0)


_EVENT_INTERVAL_EPSILON = timedelta(microseconds=1)


def _event_point_interval(anchor: datetime) -> Tuple[datetime, datetime]:
    return anchor, anchor + _EVENT_INTERVAL_EPSILON


def _slice_qs(project_id: UUID, resource_kind: str, resource_id: str):
    return MeteredUsageRecord.objects.filter(
        project_id=project_id,
        resource_kind=resource_kind,
        resource_id=resource_id,
        kind=MeteredUsageRecord.Kind.DELTA_SLICE,
    )


def max_interval_end_for_resource(
    project_id: UUID, resource_kind: str, resource_id: str
) -> Optional[datetime]:
    """Latest ``interval_end`` among DELTA_SLICE rows for the resource, if any."""
    return (
        _slice_qs(project_id, resource_kind, resource_id)
        .filter(interval_end__isnull=False)
        .aggregate(m=Max("interval_end"))
    ).get("m")


def sum_slice_metrics_for_resource(
    project_id: UUID, resource_kind: str, resource_id: str
) -> dict:
    """Sum estela flow ``metrics`` from DELTA_SLICE rows for a resource."""
    metrics_list = _slice_qs(project_id, resource_kind, resource_id).values_list(
        "metrics", flat=True
    )
    totals = sum_estela_flow_metrics(metrics_list)
    return {
        "network": totals["network"],
        "request_count": totals["request_count"],
        "item_count": totals["item_count"],
        "runtime_seconds": totals["runtime_seconds"],
        "storage_bytes": totals["storage_bytes"],
    }


def append_metered_usage_for_job_close(job: SpiderJob, project) -> None:
    """Emit the close-time ledger entry for *job*'s estela flow dimensions."""
    runtime_sec = Decimal(str(job.lifespan.total_seconds()))
    hourly_on = getattr(settings, "METERED_USAGE_HOURLY_ENABLED", False)
    from api.utils import read_scrapy_counters_from_redis

    raw = read_scrapy_counters_from_redis(job) or {}
    storage_final = int(raw.get("storage_obj_bytes_total", 0))
    resource_kind = RESOURCE_KIND_SPIDER_JOB
    resource_id = str(job.jid)

    if not hourly_on:
        close_instant = timezone.now()
        iv_start, iv_end = _event_point_interval(close_instant)
        append_metered_usage(
            idempotency_key=f"estela:SpiderJob:{job.jid}:close:v4",
            project=project,
            resource_kind=resource_kind,
            resource_id=resource_id,
            interval_start=iv_start,
            interval_end=iv_end,
            source_ref=f"spider_job:{job.jid}",
            reporter=REPORTER_ESTELA,
            metrics=build_flow_metrics(
                network_bytes=int(job.total_response_bytes),
                request_count=int(job.request_count),
                item_count=int(job.item_count),
                storage_bytes=storage_final,
                runtime_seconds=runtime_sec,
            ),
            kind=MeteredUsageRecord.Kind.JOB_CLOSE,
        )
        delete_hourly_meter_last_sample_from_redis(job)
        return

    slice_end = max_interval_end_for_resource(project.pk, resource_kind, resource_id)
    anchor = slice_end if slice_end is not None else timezone.now()
    iv_start, iv_end = _event_point_interval(anchor)

    sums = sum_slice_metrics_for_resource(project.pk, resource_kind, resource_id)
    adj_net = int(job.total_response_bytes) - sums["network"]
    adj_req = int(job.request_count) - sums["request_count"]
    adj_item = int(job.item_count) - sums["item_count"]
    adj_runtime = runtime_sec - sums["runtime_seconds"]
    adj_storage = storage_final - sums["storage_bytes"]

    delete_hourly_meter_last_sample_from_redis(job)

    if not (adj_net or adj_req or adj_item or adj_runtime or adj_storage):
        return

    scrapy_flow_residual = bool(adj_net or adj_req or adj_item or adj_runtime)
    adjustment_reason = (
        MeteredUsageRecord.AdjustmentReason.RECONCILE_SCRAPY_FINAL
        if scrapy_flow_residual
        else MeteredUsageRecord.AdjustmentReason.RECONCILE_STORAGE
    )

    append_metered_usage(
        idempotency_key=f"estela:SpiderJob:{job.jid}:close:reconcile:v4",
        project=project,
        resource_kind=resource_kind,
        resource_id=resource_id,
        interval_start=iv_start,
        interval_end=iv_end,
        source_ref=f"spider_job:{job.jid}",
        reporter=REPORTER_ESTELA,
        metrics=build_flow_metrics(
            network_bytes=adj_net,
            request_count=adj_req,
            item_count=adj_item,
            storage_bytes=adj_storage,
            runtime_seconds=adj_runtime if adj_runtime else None,
        ),
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

    append_metered_usage(
        idempotency_key=f"estela:SpiderJob:{job.jid}:data_delete:{h}:v3",
        project=project,
        resource_kind=RESOURCE_KIND_SPIDER_JOB,
        resource_id=str(job.jid),
        interval_start=iv_start,
        interval_end=iv_end,
        source_ref=f"spider_job:{job.jid}",
        reporter=REPORTER_ESTELA,
        metrics=build_flow_metrics(
            network_bytes=0,
            request_count=0,
            item_count=0,
        ),
        kind=MeteredUsageRecord.Kind.DATA_DELETE,
    )
