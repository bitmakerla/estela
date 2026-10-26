"""Usage CloudEvents to the billing stack (OpenMeter ingest), per ADR 0013.

Every 5 minutes, each RUNNING SpiderJob whose Project has a ``billing_account_id`` gets one
``DELTA_SLICE`` for the last complete UTC 5-minute window: the increment of its Scrapy counters
since the previous sample. Projects without an account are skipped (ADR 0005: no owner, no
billing). Only slices are sent: ``JOB_CLOSE`` rows summed with them would bill twice.

When the job ends, what it used after its last tick goes as one ``ADJUSTMENT``: its final totals
(the job's own row) minus what its slices already sent (the baseline), stamped now, so it lands
in the open period (ADR 0013). The baseline is then marked closed, and a tick that still finds
the job does nothing. A job that never got a tick sends its whole usage this way.

This is independent of ``MeteredUsageRecord``: it keeps its own baseline in Redis, so the
hourly ledger (read by the legacy billing app) is untouched.

Delivery is at least once. An event is put in a Redis outbox in the same transaction that moves
its job's baseline, and leaves the outbox only once OpenMeter accepts it (202). Its ``id`` is
deterministic, so a resend dedupes on (source, id). A batch refused with 400 is resent event
by event; an event refused on its own is logged and dropped. The baseline is read under WATCH,
so a tick and the close never both count the same usage.

Not yet (follow-ups): late slices re-sent as ``ADJUSTMENT``, storage byte-seconds, build usage,
and a durable outbox table.
"""

from __future__ import annotations

import json
import logging
import re
from datetime import datetime, timedelta, timezone as py_timezone
from typing import Callable, Dict, List, Optional

import redis
import requests
from django.conf import settings
from django.utils import timezone

from api.utils import read_scrapy_counters_from_redis
from core.metering.metrics import REPORTER_ESTELA
from core.models import SpiderJob
from core.tiers import RESOURCE_TIERS

logger = logging.getLogger(__name__)

EVENT_TYPE = "la.bitmaker.usage.recorded"
EVENT_SOURCE = REPORTER_ESTELA  # half of OpenMeter's dedupe key: never change it
DATASCHEMA = "https://schemas.bitmaker.la/metering/usage-recorded/v1.json"
RESOURCE_KIND_SPIDER_JOB = "spider_job"
SLICE = timedelta(minutes=5)
BILLING_ACCOUNT_ID_RE = re.compile(r"^acct_[0-9A-HJKMNP-TV-Z]{26}$")

LAST_SAMPLE_KEY = "estela:billing:last_sample:{}"
LAST_SAMPLE_TTL_SECONDS = 24 * 3600
# Kept after the close, so a repeated close (the job's post_save fires on every save in a final
# status) finds it closed and sends nothing twice.
CLOSED_SAMPLE_TTL_SECONDS = 7 * 24 * 3600
OUTBOX_KEY = "estela:billing:outbox"
WATCH_RETRIES = 5

# Redis counter -> event metric (integers in base units).
COUNTER_METRICS = (
    ("elapsed_time_seconds", "runtime_seconds"),
    ("total_response_bytes", "network_bytes"),
    ("request_count", "request_count"),
    ("item_count", "item_count"),
)

_CLIENT = None


def _redis():
    global _CLIENT
    if _CLIENT is None:
        _CLIENT = redis.from_url(settings.REDIS_URL)
    return _CLIENT


def iso(at: datetime) -> str:
    return at.astimezone(py_timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def parse_iso(value: str) -> datetime:
    return datetime.strptime(value, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=py_timezone.utc)


def slice_start(at: datetime) -> datetime:
    """The UTC 5-minute boundary at or before ``at``."""
    at = at.astimezone(py_timezone.utc)
    return at.replace(minute=at.minute - at.minute % 5, second=0, microsecond=0)


def slice_event_id(job_id, interval_start: datetime) -> str:
    """Deterministic per (job, window): a retry of the same slice reuses it."""
    index = int(interval_start.timestamp()) // int(SLICE.total_seconds())
    return f"{EVENT_SOURCE}:job:{job_id}:slice:{index}:v1"


def close_fact_id(job_id) -> str:
    """The job's close: never sent itself, but what the close adjustment corrects."""
    return f"{EVENT_SOURCE}:job:{job_id}:close:v1"


def close_adjustment_id(job_id) -> str:
    """One per job: a repeated close dedupes on it."""
    return f"{EVENT_SOURCE}:job:{job_id}:adjust:close:v1"


def _usage_event(
    *,
    event_id: str,
    time: datetime,
    kind: str,
    job_id,
    project_id,
    billing_account_id: str,
    machine_tier: Optional[str],
    interval_start: datetime,
    interval_end: datetime,
    metrics: Dict[str, int],
    **data,
) -> dict:
    dimensions = {"project_id": str(project_id)}
    # Unknown or missing tiers are billed at MEDIUM by billing's catch-all; the profile
    # only accepts the priced names, so leave anything else out.
    if machine_tier in RESOURCE_TIERS:
        dimensions["machine_tier"] = machine_tier
    return {
        "specversion": "1.0",
        "type": EVENT_TYPE,
        "source": EVENT_SOURCE,
        "id": event_id,
        "subject": billing_account_id,
        "time": iso(time),
        "dataschema": DATASCHEMA,
        "datacontenttype": "application/json",
        "data": {
            "reporter": REPORTER_ESTELA,
            "kind": kind,
            "resource_kind": RESOURCE_KIND_SPIDER_JOB,
            "resource_id": str(job_id),
            "interval_start": iso(interval_start),
            "interval_end": iso(interval_end),
            "dimensions": dimensions,
            **data,
            "metrics": {key: int(value) for key, value in metrics.items()},
        },
    }


def build_slice_event(
    *,
    job_id,
    project_id,
    billing_account_id: str,
    machine_tier: Optional[str],
    interval_start: datetime,
    interval_end: datetime,
    metrics: Dict[str, int],
) -> dict:
    """A ``DELTA_SLICE`` CloudEvent for one job over one 5-minute window."""
    return _usage_event(
        event_id=slice_event_id(job_id, interval_start),
        time=interval_start,
        kind="DELTA_SLICE",
        job_id=job_id,
        project_id=project_id,
        billing_account_id=billing_account_id,
        machine_tier=machine_tier,
        interval_start=interval_start,
        interval_end=interval_end,
        metrics=metrics,
    )


def build_close_adjustment_event(
    *,
    job_id,
    project_id,
    billing_account_id: str,
    machine_tier: Optional[str],
    interval_start: datetime,
    interval_end: datetime,
    now: datetime,
    metrics: Dict[str, int],
) -> dict:
    """The ``ADJUSTMENT`` at job close: the job's final totals minus what its slices sent.

    Stamped ``now``, not in the window it corrects: that window may be in a closed period, where
    usage would be stranded (ADR 0013). Only ever adds (see ``emit_job_close_adjustment``).
    """
    return _usage_event(
        event_id=close_adjustment_id(job_id),
        time=now,
        kind="ADJUSTMENT",
        job_id=job_id,
        project_id=project_id,
        billing_account_id=billing_account_id,
        machine_tier=machine_tier,
        interval_start=interval_start,
        interval_end=interval_end,
        metrics=metrics,
        references_id=close_fact_id(job_id),
        adjustment_reason="usage after the job's last slice, up to its final totals",
    )


def counter_deltas(current: dict, previous: Optional[dict]) -> Dict[str, int]:
    """Increments since ``previous`` (zero baseline when None), never negative."""
    previous = previous or {}
    deltas = {}
    for counter, metric in COUNTER_METRICS:
        delta = int(float(current.get(counter) or 0)) - int(
            float(previous.get(counter) or 0)
        )
        deltas[metric] = max(0, delta)
    return deltas


def job_final_counters(job: SpiderJob) -> dict:
    """The job's own final totals, keyed like the Redis counters (the close task reads them once
    the job's row has them, as the hourly ledger does)."""
    return {
        "elapsed_time_seconds": int(job.lifespan.total_seconds()) if job.lifespan else 0,
        "total_response_bytes": job.total_response_bytes or 0,
        "request_count": job.request_count or 0,
        "item_count": job.item_count or 0,
    }


def resolve_billing_account(zitadel_org_id: str) -> str:
    """The Org's ``acct_`` from the Account Registry (get-or-create: the first call mints)."""
    if not settings.ACCOUNT_REGISTRY_URL:
        raise RuntimeError("ACCOUNT_REGISTRY_URL is not set")
    response = requests.post(
        f"{settings.ACCOUNT_REGISTRY_URL.rstrip('/')}/resolve",
        json={"zitadel_org_id": zitadel_org_id},
        headers={"Authorization": f"Bearer {settings.ACCOUNT_REGISTRY_TOKEN}"},
        timeout=10,
    )
    response.raise_for_status()
    account_id = response.json()["billing_account_id"]
    if not BILLING_ACCOUNT_ID_RE.match(account_id):
        raise ValueError(f"Registry returned a malformed account id: {account_id!r}")
    return account_id


def post_events(events: List[dict]) -> int:
    """POST a batch to OpenMeter's ingest; returns the HTTP status (0 when unreachable)."""
    try:
        response = requests.post(
            settings.OPENMETER_INGEST_URL,
            data=json.dumps(events),
            headers={"Content-Type": "application/cloudevents-batch+json"},
            timeout=10,
        )
    except requests.RequestException as exc:
        logger.warning("billing ingest unreachable: %s", exc)
        return 0
    return response.status_code


def deliver(
    events: List[dict], post: Optional[Callable[[List[dict]], int]] = None
) -> List[dict]:
    """Send ``events``; returns those to keep for the next tick.

    202: accepted (a duplicate also gets 202). 400: one malformed event refuses the whole
    batch, so resend one by one and drop the ones refused alone. Anything else: retry later.
    """
    if not events:
        return []
    post = post or post_events
    status = post(events)
    if status == 202:
        return []
    if status != 400:
        logger.warning(
            "billing ingest answered %s; %d events kept", status, len(events)
        )
        return events
    kept = []
    for event in events:
        one = post([event])
        if one == 400:
            logger.error("billing ingest refused event, dropped: %s", json.dumps(event))
        elif one != 202:
            kept.append(event)
    return kept


def sample_job(
    job: SpiderJob, interval_start: datetime, interval_end: datetime
) -> None:
    """Move ``job``'s baseline to now and queue its slice for the window, if it used anything."""
    current = read_scrapy_counters_from_redis(job)
    if current is None:
        return
    key = LAST_SAMPLE_KEY.format(job.key)
    with _redis().pipeline() as pipe:
        try:
            pipe.watch(key)
            previous_raw = pipe.get(key)
            previous = json.loads(previous_raw) if previous_raw else None

            # Closed: the job ended and its close adjustment already took everything left.
            if previous and previous.get("closed"):
                return
            # Already sampled for this window (a re-run tick): a second slice with the same id
            # would be deduped and its usage lost, so leave the delta for the next window.
            if previous and previous.get("window_end") == iso(interval_end):
                return

            baseline = {counter: current.get(counter, 0) for counter, _ in COUNTER_METRICS}
            baseline["window_end"] = iso(interval_end)

            deltas = counter_deltas(current, previous)
            pipe.multi()
            if any(deltas.values()):
                project = job.spider.project
                event = build_slice_event(
                    job_id=job.jid,
                    project_id=project.pid,
                    billing_account_id=project.billing_account_id,
                    machine_tier=job.resource_tier,
                    interval_start=interval_start,
                    interval_end=interval_end,
                    metrics=deltas,
                )
                pipe.hset(OUTBOX_KEY, event["id"], json.dumps(event))
            pipe.set(key, json.dumps(baseline), ex=LAST_SAMPLE_TTL_SECONDS)
            pipe.execute()
        except redis.WatchError:
            # The job closed (or another tick sampled it) while this one read: its usage is
            # counted there, so this tick leaves it.
            return


def emit_job_close_adjustment(job: SpiderJob, now: Optional[datetime] = None) -> None:
    """At job close, queue and send what the job used after its last slice (once per job)."""
    if not settings.BILLING_EMIT_ENABLED or not settings.OPENMETER_INGEST_URL:
        return
    project = job.spider.project
    if not (project.billing_account_id or "").startswith("acct_"):
        return
    now = now or timezone.now()
    final = job_final_counters(job)
    key = LAST_SAMPLE_KEY.format(job.key)
    for _ in range(WATCH_RETRIES):
        with _redis().pipeline() as pipe:
            try:
                pipe.watch(key)
                previous_raw = pipe.get(key)
                previous = json.loads(previous_raw) if previous_raw else None
                if previous and previous.get("closed"):
                    return

                # Never negative, though ADR 0013 allows a signed adjustment: a final total under
                # what was sent means the job's row is short (copying its stats from Redis can
                # fail silently when it is stopped or found dead), not that it used less, and
                # taking usage back would erase what its slices billed. At worst a rounding
                # second is billed twice.
                deltas = {
                    metric: delta
                    for metric, delta in counter_deltas(final, previous).items()
                    if delta
                }
                closed = dict(final, closed=True)
                if previous and previous.get("window_end"):
                    closed["window_end"] = previous["window_end"]

                pipe.multi()
                if deltas:
                    # The window it corrects: from the last slice's end (or the job's creation,
                    # when no tick ever saw it) to now.
                    since = (
                        parse_iso(previous["window_end"])
                        if previous and previous.get("window_end")
                        else job.created
                    )
                    event = build_close_adjustment_event(
                        job_id=job.jid,
                        project_id=project.pid,
                        billing_account_id=project.billing_account_id,
                        machine_tier=job.resource_tier,
                        interval_start=min(since, now),
                        interval_end=now,
                        now=now,
                        metrics=deltas,
                    )
                    pipe.hset(OUTBOX_KEY, event["id"], json.dumps(event))
                pipe.set(key, json.dumps(closed), ex=CLOSED_SAMPLE_TTL_SECONDS)
                pipe.execute()
                break
            except redis.WatchError:
                continue  # a tick moved the baseline meanwhile: read it again
    else:
        logger.error(
            "billing close adjustment for job %s lost the race %d times",
            job.jid,
            WATCH_RETRIES,
        )
        return
    flush_outbox()


def flush_outbox(post: Optional[Callable[[List[dict]], int]] = None) -> None:
    r = _redis()
    pending = r.hgetall(OUTBOX_KEY)
    if not pending:
        return
    events = [json.loads(raw) for raw in pending.values()]
    kept_ids = {event["id"] for event in deliver(events, post)}
    done = [event["id"] for event in events if event["id"] not in kept_ids]
    if done:
        r.hdel(OUTBOX_KEY, *done)


def emit_billing_usage_batch(now: Optional[datetime] = None) -> None:
    if not settings.BILLING_EMIT_ENABLED or not settings.OPENMETER_INGEST_URL:
        return
    now = now or timezone.now()
    interval_end = slice_start(now)
    interval_start = interval_end - SLICE
    jobs = (
        SpiderJob.objects.filter(
            status=SpiderJob.RUNNING_STATUS,
            spider__project__billing_account_id__startswith="acct_",
        )
        .select_related("spider__project")
        .order_by("jid")[: settings.BILLING_EMIT_MAX_JOBS]
    )
    for job in jobs:
        try:
            sample_job(job, interval_start, interval_end)
        except Exception:
            logger.exception("billing usage sample failed for job %s", job.jid)
    flush_outbox()
