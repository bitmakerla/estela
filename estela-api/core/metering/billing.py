"""Usage CloudEvents to the billing stack (OpenMeter ingest), per ADR 0013.

Every 5 minutes, each RUNNING SpiderJob whose Project has a ``billing_account_id`` gets one
``DELTA_SLICE`` for the last complete UTC 5-minute window: the increment of its Scrapy counters
since the previous sample. Projects without an account are skipped (ADR 0005: no owner, no
billing). Only slices are sent: ``JOB_CLOSE`` rows summed with them would bill twice.

This is independent of ``MeteredUsageRecord``: it keeps its own baseline in Redis, so the
hourly ledger (read by the legacy billing app) is untouched.

Delivery is at least once. A slice is put in a Redis outbox in the same transaction that moves
its job's baseline, and leaves the outbox only once OpenMeter accepts it (202). Its ``id`` is
deterministic, so a resend dedupes on (source, id). A batch refused with 400 is resent event
by event; an event refused on its own is logged and dropped.

Not yet (follow-ups): the usage between a job's last tick and its end, late slices re-sent as
``ADJUSTMENT``, storage byte-seconds, build usage, and a durable outbox table.
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
OUTBOX_KEY = "estela:billing:outbox"

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


def slice_start(at: datetime) -> datetime:
    """The UTC 5-minute boundary at or before ``at``."""
    at = at.astimezone(py_timezone.utc)
    return at.replace(minute=at.minute - at.minute % 5, second=0, microsecond=0)


def slice_event_id(job_id, interval_start: datetime) -> str:
    """Deterministic per (job, window): a retry of the same slice reuses it."""
    index = int(interval_start.timestamp()) // int(SLICE.total_seconds())
    return f"{EVENT_SOURCE}:job:{job_id}:slice:{index}:v1"


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
    dimensions = {"project_id": str(project_id)}
    # Unknown or missing tiers are billed at MEDIUM by billing's catch-all; the profile
    # only accepts the priced names, so leave anything else out.
    if machine_tier in RESOURCE_TIERS:
        dimensions["machine_tier"] = machine_tier
    return {
        "specversion": "1.0",
        "type": EVENT_TYPE,
        "source": EVENT_SOURCE,
        "id": slice_event_id(job_id, interval_start),
        "subject": billing_account_id,
        "time": iso(interval_start),
        "dataschema": DATASCHEMA,
        "datacontenttype": "application/json",
        "data": {
            "reporter": REPORTER_ESTELA,
            "kind": "DELTA_SLICE",
            "resource_kind": RESOURCE_KIND_SPIDER_JOB,
            "resource_id": str(job_id),
            "interval_start": iso(interval_start),
            "interval_end": iso(interval_end),
            "dimensions": dimensions,
            "metrics": {key: int(value) for key, value in metrics.items()},
        },
    }


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
    r = _redis()
    key = LAST_SAMPLE_KEY.format(job.key)
    previous_raw = r.get(key)
    previous = json.loads(previous_raw) if previous_raw else None

    # Already sampled for this window (a re-run tick): a second slice with the same id would
    # be deduped and its usage lost, so leave the delta for the next window.
    if previous and previous.get("window_end") == iso(interval_end):
        return

    baseline = {counter: current.get(counter, 0) for counter, _ in COUNTER_METRICS}
    baseline["window_end"] = iso(interval_end)

    deltas = counter_deltas(current, previous)
    pipe = r.pipeline(transaction=True)
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
