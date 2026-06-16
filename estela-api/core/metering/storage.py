"""Hourly trapezoidal DELTA_SLICE retention metering for project spiderdata.

Each UTC hour with non-zero stock (start or end) yields one append-only row::

    storage_byte_hours = (bytes_start + bytes_end) // 2 × 1

``bytes_start`` comes from the Redis watermark (previous tick's ``bytes_end``),
with fallbacks for cold start / ledger recovery. Stock is read via MongoDB
``dbStats.dataSize`` (one call per project database).
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta, timezone as dt_timezone
from typing import Optional, Set, Tuple
from uuid import UUID

import redis
from django.conf import settings
from django.utils import timezone

from config.job_manager import spiderdata_db_client
from core.metering.metrics import (
    REPORTER_ESTELA,
    RESOURCE_KIND_PROJECT,
    RESOURCE_KIND_PROJECT_STORAGE,
    build_storage_retention_metrics,
    retention_metrics_bytes_end,
)

STORAGE_RESOURCE_KINDS = (RESOURCE_KIND_PROJECT_STORAGE, RESOURCE_KIND_PROJECT)
from core.metering.report import append_metered_usage
from core.models import DataStatus, MeteredUsageRecord, Project, SpiderJob

logger = logging.getLogger(__name__)

METER_STORAGE_ACTIVE_PROJECTS_KEY = "estela:meter:storage:active_projects:v1"
METER_STORAGE_LAST_SAMPLE_KEY = "estela:meter:storage:last_sample:{}:v2"

_CLIENT = None


def _redis():
    global _CLIENT
    if _CLIENT is None:
        _CLIENT = redis.from_url(settings.REDIS_URL)
    return _CLIENT


def _last_sample_key(project_pk: UUID) -> str:
    return METER_STORAGE_LAST_SAMPLE_KEY.format(project_pk)


def previous_utc_hour_interval(
    reference: Optional[datetime] = None,
) -> Tuple[datetime, datetime]:
    """Half-open ``[hour_start, hour_end)`` for the last complete UTC hour."""
    ref = reference or timezone.now()
    if timezone.is_naive(ref):
        ref = timezone.make_aware(ref, dt_timezone.utc)
    else:
        ref = ref.astimezone(dt_timezone.utc)
    hour_end = ref.replace(minute=0, second=0, microsecond=0)
    hour_start = hour_end - timedelta(hours=1)
    return hour_start, hour_end


def get_project_spiderdata_storage_bytes(project_id: str) -> Optional[int]:
    """Return total spiderdata ``dataSize`` for a project (Mongo ``dbStats``)."""
    if not spiderdata_db_client.get_connection():
        return None
    get_size = getattr(spiderdata_db_client, "get_project_database_data_size", None)
    if get_size is None:
        logger.error(
            "spiderdata client lacks get_project_database_data_size; cannot meter storage"
        )
        return None
    return int(get_size(project_id))


def _load_last_sample(project_pk: UUID) -> Optional[dict]:
    raw = _redis().get(_last_sample_key(project_pk))
    if raw is None:
        return None
    if isinstance(raw, bytes):
        raw = raw.decode()
    return json.loads(raw)


def _save_last_sample(project_pk: UUID, *, storage_bytes_end: int, observed_at: datetime) -> None:
    if timezone.is_naive(observed_at):
        observed_at = timezone.make_aware(observed_at, dt_timezone.utc)
    else:
        observed_at = observed_at.astimezone(dt_timezone.utc)
    payload = {
        "observed_at": observed_at.isoformat(),
        "storage_bytes_end": int(storage_bytes_end),
    }
    _redis().set(_last_sample_key(project_pk), json.dumps(payload))


def _delete_last_sample(project_pk: UUID) -> None:
    _redis().delete(_last_sample_key(project_pk))


def _last_storage_meter_row(project: Project) -> Optional[MeteredUsageRecord]:
    return (
        MeteredUsageRecord.objects.filter(
            project=project,
            resource_kind__in=STORAGE_RESOURCE_KINDS,
            resource_id=str(project.pid),
            kind=MeteredUsageRecord.Kind.DELTA_SLICE,
        )
        .order_by("-interval_end")
        .first()
    )


def resolve_storage_bytes_start(
    project: Project,
    *,
    bytes_end: int,
    hour_start: datetime,
    prev_sample: Optional[dict],
) -> int:
    """Trapezoid left endpoint: Redis watermark, then ledger, then cold-start seed."""
    if prev_sample is not None:
        raw = prev_sample.get("storage_bytes_end", prev_sample.get("storage_bytes", 0))
        return int(raw)

    last_row = _last_storage_meter_row(project)
    if last_row is not None:
        row_bytes_end = retention_metrics_bytes_end(last_row.metrics)
        if row_bytes_end is not None:
            row_end = last_row.interval_end
            if row_end is not None:
                if timezone.is_naive(row_end):
                    row_end = timezone.make_aware(row_end, dt_timezone.utc)
                if row_end <= hour_start:
                    return row_bytes_end

    # Cold start on existing retention: endpoint for this hour only (start == end).
    return int(bytes_end)


def trapezoidal_storage_byte_hours(bytes_start: int, bytes_end: int, hours: int = 1) -> int:
    return (int(bytes_start) + int(bytes_end)) // 2 * int(hours)


def _active_project_ids_from_redis() -> Set[str]:
    raw = _redis().smembers(METER_STORAGE_ACTIVE_PROJECTS_KEY)
    out: Set[str] = set()
    for member in raw or []:
        if isinstance(member, bytes):
            out.add(member.decode())
        else:
            out.add(str(member))
    return out


def _mark_project_storage_active(project_pk: UUID) -> None:
    _redis().sadd(METER_STORAGE_ACTIVE_PROJECTS_KEY, str(project_pk))


def _mark_project_storage_inactive(project_pk: UUID) -> None:
    _redis().srem(METER_STORAGE_ACTIVE_PROJECTS_KEY, str(project_pk))
    _delete_last_sample(project_pk)


def project_ids_to_meter_storage() -> Set[UUID]:
    """Projects with retained job data or a recent non-zero storage sample."""
    job_project_ids = set(
        SpiderJob.objects.filter(
            spider__project__deleted=False,
            data_status__in=(
                DataStatus.PERSISTENT_STATUS,
                DataStatus.PENDING_STATUS,
            ),
            status__in=(
                SpiderJob.RUNNING_STATUS,
                SpiderJob.COMPLETED_STATUS,
                SpiderJob.STOPPED_STATUS,
            ),
        )
        .values_list("spider__project_id", flat=True)
        .distinct()
    )
    redis_ids = _active_project_ids_from_redis()
    redis_project_ids = {UUID(pid) for pid in redis_ids}
    return job_project_ids | redis_project_ids


def process_hourly_storage_metered_usage_for_project(
    project: Project,
    *,
    hour_start: datetime,
    hour_end: datetime,
    observed_at: Optional[datetime] = None,
) -> None:
    """Sample spiderdata stock and append one hourly trapezoid row when warranted."""
    bytes_end = get_project_spiderdata_storage_bytes(str(project.pid))
    if bytes_end is None:
        return

    prev_sample = _load_last_sample(project.pk)
    bytes_start = resolve_storage_bytes_start(
        project,
        bytes_end=bytes_end,
        hour_start=hour_start,
        prev_sample=prev_sample,
    )

    if bytes_end <= 0 and bytes_start <= 0:
        _mark_project_storage_inactive(project.pk)
        return

    if bytes_end > 0:
        _mark_project_storage_active(project.pk)

    storage_byte_hours = trapezoidal_storage_byte_hours(bytes_start, bytes_end)
    if storage_byte_hours <= 0:
        return

    hour_label = hour_start.astimezone(dt_timezone.utc).strftime("%Y-%m-%dT%H:00:00Z")

    append_metered_usage(
        idempotency_key=f"estela:ProjectStorage:{project.pid}:storage:hour:{hour_label}:v3",
        project=project,
        resource_kind=RESOURCE_KIND_PROJECT_STORAGE,
        resource_id=str(project.pid),
        interval_start=hour_start,
        interval_end=hour_end,
        source_ref=f"project:{project.pid}",
        reporter=REPORTER_ESTELA,
        metrics=build_storage_retention_metrics(
            storage_bytes_end=bytes_end,
            storage_byte_hours=storage_byte_hours,
            storage_bytes_start=bytes_start,
        ),
        kind=MeteredUsageRecord.Kind.DELTA_SLICE,
    )

    sample_at = observed_at or timezone.now()
    _save_last_sample(project.pk, storage_bytes_end=bytes_end, observed_at=sample_at)


def bootstrap_storage_meter_watermarks() -> int:
    """Seed Redis watermarks from Mongo for existing retention; no ledger rows."""
    if not spiderdata_db_client.get_connection():
        logger.error("Failed to connect to spiderdata DB - skipping storage bootstrap")
        return 0

    now = timezone.now()
    count = 0
    for project in Project.objects.filter(deleted=False).order_by("pid"):
        try:
            bytes_total = get_project_spiderdata_storage_bytes(str(project.pid))
        except Exception:
            logger.exception("bootstrap storage sample failed for project %s", project.pid)
            continue
        if bytes_total is None or bytes_total <= 0:
            continue
        _mark_project_storage_active(project.pk)
        _save_last_sample(project.pk, storage_bytes_end=bytes_total, observed_at=now)
        count += 1
    return count


def record_hourly_storage_metered_usage_batch(
    reference: Optional[datetime] = None,
) -> None:
    if not getattr(settings, "METERED_USAGE_STORAGE_HOURLY_ENABLED", False):
        return
    if not spiderdata_db_client.get_connection():
        logger.error(
            "Failed to connect to spiderdata DB - skipping hourly storage metering"
        )
        return

    ref = reference or timezone.now()
    hour_start, hour_end = previous_utc_hour_interval(ref)
    project_ids = project_ids_to_meter_storage()
    if not project_ids:
        return

    max_projects = getattr(settings, "METERED_USAGE_STORAGE_HOURLY_MAX_PROJECTS", 5000)
    qs = Project.objects.filter(pk__in=project_ids, deleted=False).order_by("pid")[
        :max_projects
    ]
    for project in qs:
        try:
            process_hourly_storage_metered_usage_for_project(
                project,
                hour_start=hour_start,
                hour_end=hour_end,
                observed_at=ref,
            )
        except Exception:
            logger.exception("hourly storage meter failed for project %s", project.pid)
