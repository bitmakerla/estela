"""Hourly trapezoidal metering of each Project's spiderdata storage.

Each run measures the hour that just ended, or, after missed runs, everything since the last
measurement (the gap)::

    storage_byte_hours = (bytes_start + bytes_end) // 2 × hours

``bytes_end`` is the Project's spiderdata size now (MongoDB ``dbStats.dataSize``, one call per
Project database). ``bytes_start`` is the size the previous run saw, kept in a Redis watermark
with the end of the last hour it covered. With no watermark (first sight, or Redis lost it) a
Project starts cold on the current hour only, with ``bytes_start == bytes_end``: a few hours go
unmeasured, never twice.

Where the measurement goes depends on the Project and on BILLING_STORAGE_EMIT_ENABLED:

- **On, and the Project has an** ``acct_``: one usage CloudEvent straight to the billing stack
  (``billing.build_storage_event``), put in billing's outbox in the same Redis transaction that
  moves the watermark, so a rerun of the hour finds nothing to send. No ledger row.
- **Otherwise**: one ``MeteredUsageRecord`` row per hour, as before (the hourly ledger the legacy
  billing app reads). This path never catches up a gap.
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
from core.metering.billing import OUTBOX_KEY, build_storage_event, flush_outbox
from core.metering.metrics import (
    REPORTER_ESTELA,
    RESOURCE_KIND_PROJECT_STORAGE,
    build_storage_retention_metrics,
)
from core.metering.report import append_metered_usage
from core.models import DataStatus, MeteredUsageRecord, Project, SpiderJob

logger = logging.getLogger(__name__)

METER_STORAGE_ACTIVE_PROJECTS_KEY = "estela:meter:storage:active_projects:v1"
METER_STORAGE_LAST_SAMPLE_KEY = "estela:meter:storage:last_sample:{}:v2"
HOUR = timedelta(hours=1)
# A gap longer than this (missed runs) is still billed whole, and logged.
GAP_WARNING = timedelta(hours=2)

_CLIENT = None


def _redis():
    global _CLIENT
    if _CLIENT is None:
        _CLIENT = redis.from_url(settings.REDIS_URL)
    return _CLIENT


def _last_sample_key(project_pk: UUID) -> str:
    return METER_STORAGE_LAST_SAMPLE_KEY.format(project_pk)


def _utc(at: datetime) -> datetime:
    if timezone.is_naive(at):
        return timezone.make_aware(at, dt_timezone.utc)
    return at.astimezone(dt_timezone.utc)


def _hour_floor(at: datetime) -> datetime:
    return _utc(at).replace(minute=0, second=0, microsecond=0)


def previous_utc_hour_interval(
    reference: Optional[datetime] = None,
) -> Tuple[datetime, datetime]:
    """Half-open ``[hour_start, hour_end)`` for the last complete UTC hour."""
    hour_end = _hour_floor(reference or timezone.now())
    return hour_end - HOUR, hour_end


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


def _sample_payload(
    *, storage_bytes_end: int, observed_at: datetime, covered_until: Optional[datetime]
) -> str:
    payload = {
        "observed_at": _utc(observed_at).isoformat(),
        "storage_bytes_end": int(storage_bytes_end),
    }
    if covered_until is not None:
        payload["covered_until"] = _utc(covered_until).isoformat()
    return json.dumps(payload)


def _save_last_sample(
    project_pk: UUID,
    *,
    storage_bytes_end: int,
    observed_at: datetime,
    covered_until: Optional[datetime] = None,
) -> None:
    _redis().set(
        _last_sample_key(project_pk),
        _sample_payload(
            storage_bytes_end=storage_bytes_end,
            observed_at=observed_at,
            covered_until=covered_until,
        ),
    )


def _delete_last_sample(project_pk: UUID) -> None:
    _redis().delete(_last_sample_key(project_pk))


def covered_until(sample: Optional[dict]) -> Optional[datetime]:
    """The end of the last hour a watermark covered. Watermarks written before it was stored carry
    only ``observed_at``, the time of the run, which covered the hour ending at that hour's start."""
    if not sample:
        return None
    if sample.get("covered_until"):
        return _utc(datetime.fromisoformat(sample["covered_until"]))
    if sample.get("observed_at"):
        return _hour_floor(datetime.fromisoformat(sample["observed_at"]))
    return None


def resolve_storage_bytes_start(*, bytes_end: int, prev_sample: Optional[dict]) -> int:
    """Trapezoid left endpoint: the watermark's size, or, with none, ``bytes_end`` (cold start)."""
    if prev_sample is not None:
        raw = prev_sample.get("storage_bytes_end", prev_sample.get("storage_bytes", 0))
        return int(raw)
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


def storage_emit_enabled() -> bool:
    return bool(settings.BILLING_STORAGE_EMIT_ENABLED and settings.OPENMETER_INGEST_URL)


def _emits_storage(project: Project) -> bool:
    return storage_emit_enabled() and (project.billing_account_id or "").startswith("acct_")


def emit_project_storage(
    project: Project,
    *,
    bytes_end: int,
    hour_start: datetime,
    hour_end: datetime,
    now: datetime,
) -> None:
    """Queue the Project's storage since its watermark, up to ``hour_end``, as one event, and move
    the watermark in the same transaction. A rerun of an hour already covered does nothing."""
    key = _last_sample_key(project.pk)
    with _redis().pipeline() as pipe:
        try:
            pipe.watch(key)
            raw = pipe.get(key)
            if isinstance(raw, bytes):
                raw = raw.decode()
            sample = json.loads(raw) if raw else None
            covered = covered_until(sample)
            if covered is not None and covered >= hour_end:
                return  # this hour (or a later one) is already counted

            start = hour_start if covered is None else min(covered, hour_start)
            bytes_start = resolve_storage_bytes_start(bytes_end=bytes_end, prev_sample=sample)
            hours = int((hour_end - start) / HOUR)
            if hour_end - start > GAP_WARNING:
                logger.warning(
                    "storage for project %s not measured for %d hours (%s to %s): billed as one "
                    "event, from %d to %d bytes",
                    project.pid,
                    hours,
                    start.isoformat(),
                    hour_end.isoformat(),
                    bytes_start,
                    bytes_end,
                )

            pipe.multi()
            if bytes_end <= 0 and bytes_start <= 0:
                pipe.srem(METER_STORAGE_ACTIVE_PROJECTS_KEY, str(project.pk))
                pipe.delete(key)
                pipe.execute()
                return
            if bytes_end > 0:
                pipe.sadd(METER_STORAGE_ACTIVE_PROJECTS_KEY, str(project.pk))
            byte_hours = trapezoidal_storage_byte_hours(bytes_start, bytes_end, hours)
            if byte_hours > 0:
                event = build_storage_event(
                    project_id=project.pid,
                    billing_account_id=project.billing_account_id,
                    interval_start=start,
                    interval_end=hour_end,
                    byte_seconds=byte_hours * 3600,
                    now=now,
                )
                pipe.hset(OUTBOX_KEY, event["id"], json.dumps(event))
                # What the staging check compares with OpenMeter, now that no ledger row is kept.
                logger.info(
                    "storage for project %s, %s to %s: %d to %d bytes, %d byte-hours, event %s",
                    project.pid,
                    start.isoformat(),
                    hour_end.isoformat(),
                    bytes_start,
                    bytes_end,
                    byte_hours,
                    event["id"],
                )
            pipe.set(
                key,
                _sample_payload(
                    storage_bytes_end=bytes_end, observed_at=now, covered_until=hour_end
                ),
            )
            pipe.execute()
        except redis.WatchError:
            return  # another run moved the watermark meanwhile: it counted this hour


def process_hourly_storage_metered_usage_for_project(
    project: Project,
    *,
    hour_start: datetime,
    hour_end: datetime,
    observed_at: Optional[datetime] = None,
) -> None:
    """Measure the Project's storage now: an event to billing, or a ledger row (module docstring)."""
    bytes_end = get_project_spiderdata_storage_bytes(str(project.pid))
    if bytes_end is None:
        return
    sample_at = observed_at or timezone.now()

    if _emits_storage(project):
        emit_project_storage(
            project,
            bytes_end=bytes_end,
            hour_start=_utc(hour_start),
            hour_end=_utc(hour_end),
            now=_utc(sample_at),
        )
        return

    prev_sample = _load_last_sample(project.pk)
    bytes_start = resolve_storage_bytes_start(bytes_end=bytes_end, prev_sample=prev_sample)

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

    _save_last_sample(
        project.pk, storage_bytes_end=bytes_end, observed_at=sample_at, covered_until=hour_end
    )


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
    if storage_emit_enabled():
        # Send now rather than at the next 5-minute tick; what is refused stays for that tick.
        try:
            flush_outbox()
        except Exception:
            logger.exception("billing storage flush failed")
