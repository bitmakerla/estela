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

Storage goes once per UTC day per Project, as one ``DELTA_SLICE`` of ``storage_byte_seconds``:
the day's hourly ``storage_byte_hours`` rows from that ledger (``storage.py``, which it only
reads) × 3600. A day goes once the hourly task has metered its last hour; one sent more than
STORAGE_ON_TIME after it ended goes as an ``ADJUSTMENT`` stamped now, and an hour metered after
its day was sent goes alone as one. A Project the sender has no record of starts from the current
day, never an earlier one: losing that record leaves days unbilled, never billed twice. Switched
by BILLING_STORAGE_EMIT_ENABLED, apart from jobs; BILLING_STORAGE_NOT_BEFORE holds back older
days.

Delivery is at least once. An event is put in a Redis outbox in the same transaction that moves
its job's baseline, and leaves the outbox only once OpenMeter accepts it (202). Its ``id`` is
deterministic, so a resend dedupes on (source, id). A batch refused with 400 is resent event
by event; an event refused on its own is logged and dropped. The baseline is read under WATCH,
so a tick and the close never both count the same usage.

Not yet (follow-ups): late job slices re-sent as ``ADJUSTMENT``, build usage, and a durable
outbox table.
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
from core.metering.metrics import METRIC_STORAGE_BYTE_HOURS, REPORTER_ESTELA
from core.metering.metrics import RESOURCE_KIND_PROJECT_STORAGE as LEDGER_PROJECT_STORAGE
from core.metering.storage import METER_STORAGE_HOUR_DONE_KEY
from core.models import MeteredUsageRecord, Project, SpiderJob
from core.tiers import RESOURCE_TIERS

logger = logging.getLogger(__name__)

EVENT_TYPE = "la.bitmaker.usage.recorded"
EVENT_SOURCE = REPORTER_ESTELA  # half of OpenMeter's dedupe key: never change it
DATASCHEMA = "https://schemas.bitmaker.la/metering/usage-recorded/v1.json"
RESOURCE_KIND_SPIDER_JOB = "spider_job"
SLICE = timedelta(minutes=5)
BILLING_ACCOUNT_ID_RE = re.compile(r"^acct_[0-9A-HJKMNP-TV-Z]{26}$")

LAST_SAMPLE_KEY = "estela:billing:last_sample:{}"
# The baseline has to outlive the job it belongs to, and any spell where nothing samples it: the
# emitter switched off, the worker or beat down. If it expires under a running Job, the next tick
# finds no baseline, reads the job's counters as increments and bills again everything that Job has
# used so far, which an invoice cannot take back. A day covered neither. The close replaces this
# with CLOSED_SAMPLE_TTL_SECONDS, so a finished Job keeps nothing for a month.
LAST_SAMPLE_TTL_SECONDS = 30 * 24 * 3600
# Kept after the close, so a repeated close (the job's post_save fires on every save in a final
# status) finds it closed and sends nothing twice.
CLOSED_SAMPLE_TTL_SECONDS = 7 * 24 * 3600
OUTBOX_KEY = "estela:billing:outbox"
WATCH_RETRIES = 5

RESOURCE_KIND_PROJECT_STORAGE = "project_storage"
DAY = timedelta(days=1)
# A day sent later than this after its end goes as an ADJUSTMENT stamped now, not as its slice.
# The hourly task meters a day's last hour at about 00:05, and a tick sends it by about 00:10.
STORAGE_ON_TIME = timedelta(minutes=30)
# Per Project: {"from", "next", "sent"}. Days before "from" are never sent; "next" is the next day
# to send; "sent" maps each day sent to a 24-bit mask of the hours its event counted.
STORAGE_STATE_KEY = "estela:billing:storage:{}"
# Past OpenMeter's 32-day dedupe window. Written daily, so it only expires if the sender stops
# that long, and then the Project starts again from that day (see emit_storage_usage).
STORAGE_KEEP = timedelta(days=35)
STORAGE_STATE_TTL_SECONDS = int(STORAGE_KEEP.total_seconds())
# When the last tick ran; the next looks for late rows recorded since, less a margin for rows
# whose transaction committed after that tick read.
STORAGE_LATE_CURSOR_KEY = "estela:billing:storage:late_cursor"
STORAGE_LATE_MARGIN = timedelta(hours=1)

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


def _event(
    *,
    event_id: str,
    time: datetime,
    kind: str,
    resource_kind: str,
    resource_id,
    billing_account_id: str,
    dimensions: Dict[str, str],
    interval_start: datetime,
    interval_end: datetime,
    metrics: Dict[str, int],
    **data,
) -> dict:
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
            "resource_kind": resource_kind,
            "resource_id": str(resource_id),
            "interval_start": iso(interval_start),
            "interval_end": iso(interval_end),
            "dimensions": dimensions,
            **data,
            "metrics": {key: int(value) for key, value in metrics.items()},
        },
    }


def _usage_event(
    *,
    job_id,
    project_id,
    machine_tier: Optional[str],
    **fields,
) -> dict:
    dimensions = {"project_id": str(project_id)}
    # Unknown or missing tiers are billed at MEDIUM by billing's catch-all; the profile
    # only accepts the priced names, so leave anything else out.
    if machine_tier in RESOURCE_TIERS:
        dimensions["machine_tier"] = machine_tier
    return _event(
        resource_kind=RESOURCE_KIND_SPIDER_JOB,
        resource_id=job_id,
        dimensions=dimensions,
        **fields,
    )


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


def list_accounts(billing_states: List[str]) -> List[dict]:
    """Every account in the Account Registry whose Billing state is one of ``billing_states``, each
    ``{"billing_account_id", "zitadel_org_id", "name", "billing_state", ...}``, all pages."""
    if not settings.ACCOUNT_REGISTRY_URL:
        raise RuntimeError("ACCOUNT_REGISTRY_URL is not set")
    accounts, after = [], None
    while True:
        params = {"billing_state": ",".join(billing_states)}
        if after:
            params["after"] = after
        response = requests.get(
            f"{settings.ACCOUNT_REGISTRY_URL.rstrip('/')}/accounts",
            params=params,
            headers={"Authorization": f"Bearer {settings.ACCOUNT_REGISTRY_TOKEN}"},
            timeout=10,
        )
        response.raise_for_status()
        page = response.json()
        accounts.extend(page["accounts"])
        after = page.get("next")
        if not after:
            return accounts


USER_ID_RE =re.compile(r"^usr_[0-9A-HJKMNP-TV-Z]{26}$")


def resolve_user_id(issuer: str, idp_user_id: str) -> str:
    """The person's ``usr_`` from the Account Registry, minted the first time this identity is seen
    (ADR 0017). Raises on any failure; the caller decides whether that matters."""
    if not settings.ACCOUNT_REGISTRY_URL:
        raise RuntimeError("ACCOUNT_REGISTRY_URL is not set")
    response = requests.post(
        f"{settings.ACCOUNT_REGISTRY_URL.rstrip('/')}/users/resolve",
        json={"issuer": issuer, "idp_user_id": idp_user_id},
        headers={"Authorization": f"Bearer {settings.ACCOUNT_REGISTRY_TOKEN}"},
        timeout=5,
    )
    response.raise_for_status()
    user_id = response.json()["user_id"]
    if not USER_ID_RE.match(user_id):
        raise ValueError(f"Registry returned a malformed user id: {user_id!r}")
    return user_id


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


def day_start(at: datetime) -> datetime:
    """The UTC midnight at or before ``at``."""
    return at.astimezone(py_timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)


def _day_key(day: datetime) -> str:
    return day.strftime("%Y-%m-%d")


def _day(key: str) -> datetime:
    return datetime.strptime(key, "%Y-%m-%d").replace(tzinfo=py_timezone.utc)


def storage_day_id(project_id, day: datetime) -> str:
    """The day's slice: what a late day, and a late hour of it, correct."""
    return f"{EVENT_SOURCE}:project:{project_id}:storage:day:{_day_key(day)}:v1"


def storage_day_adjustment_id(project_id, day: datetime) -> str:
    return f"{EVENT_SOURCE}:project:{project_id}:storage:day:{_day_key(day)}:adjust:v1"


def storage_hour_adjustment_id(project_id, hour: datetime) -> str:
    return f"{EVENT_SOURCE}:project:{project_id}:storage:hour:{iso(hour)}:adjust:v1"


def _storage_fields(
    project_id, billing_account_id: str, start: datetime, end: datetime, byte_seconds: int
) -> dict:
    return dict(
        resource_kind=RESOURCE_KIND_PROJECT_STORAGE,
        resource_id=project_id,
        billing_account_id=billing_account_id,
        dimensions={"project_id": str(project_id)},
        interval_start=start,
        interval_end=end,
        metrics={"storage_byte_seconds": byte_seconds},
    )


def build_storage_day_event(
    *, project_id, billing_account_id: str, day: datetime, byte_seconds: int, now: datetime
) -> dict:
    """A Project's storage over one UTC day: its ``DELTA_SLICE``, or, sent more than
    STORAGE_ON_TIME after the day's end, an ``ADJUSTMENT`` stamped now (its day's period may be
    invoiced already, ADR 0013)."""
    fields = _storage_fields(project_id, billing_account_id, day, day + DAY, byte_seconds)
    if now <= day + DAY + STORAGE_ON_TIME:
        return _event(
            event_id=storage_day_id(project_id, day), time=day, kind="DELTA_SLICE", **fields
        )
    return _event(
        event_id=storage_day_adjustment_id(project_id, day),
        time=now,
        kind="ADJUSTMENT",
        references_id=storage_day_id(project_id, day),
        adjustment_reason="the day's storage, sent late",
        **fields,
    )


def build_storage_hour_adjustment_event(
    *, project_id, billing_account_id: str, hour: datetime, byte_seconds: int, now: datetime
) -> dict:
    """An hour metered after its day was sent: an ``ADJUSTMENT`` of that hour alone, stamped now.
    Resending the day would count the rest of it twice."""
    return _event(
        event_id=storage_hour_adjustment_id(project_id, hour),
        time=now,
        kind="ADJUSTMENT",
        references_id=storage_day_id(project_id, day_start(hour)),
        adjustment_reason="an hour of storage metered after its day was sent",
        **_storage_fields(
            project_id, billing_account_id, hour, hour + timedelta(hours=1), byte_seconds
        ),
    )


def _first_storage_day() -> Optional[datetime]:
    """The first day BILLING_STORAGE_NOT_BEFORE lets go out (None when unset)."""
    if not settings.BILLING_STORAGE_NOT_BEFORE:
        return None
    not_before = parse_iso(settings.BILLING_STORAGE_NOT_BEFORE)
    first = day_start(not_before)
    return first if first == not_before else first + DAY


def _storage_hours(**filters) -> Dict:
    """The hourly storage task's own rows, as {project pk: {hour start: byte-hours}}. Rows posted
    through the metering API are left out, whatever kind they claim."""
    hours: Dict = {}
    rows = (
        MeteredUsageRecord.objects.filter(
            resource_kind=LEDGER_PROJECT_STORAGE,
            kind=MeteredUsageRecord.Kind.DELTA_SLICE,
            idempotency_key__startswith="estela:ProjectStorage:",
            idempotency_key__contains=":storage:hour:",
            project__billing_account_id__startswith="acct_",
            **filters,
        )
        .order_by()
        .values_list("project_id", "interval_start", "metrics")
    )
    for project_id, start, metrics in rows:
        hours.setdefault(project_id, {})[start.astimezone(py_timezone.utc)] = int(
            (metrics or {}).get(METRIC_STORAGE_BYTE_HOURS) or 0
        )
    return hours


def emit_project_storage(
    project_id,
    billing_account_id: str,
    hours: Dict[datetime, int],
    complete_until: Optional[datetime],
    now: datetime,
) -> None:
    """Queue a Project's days that are complete and not yet sent, and the hours metered after their
    day was sent; move its record in the same transaction."""
    key = STORAGE_STATE_KEY.format(project_id)
    first_allowed = _first_storage_day()
    keep_from = day_start(now) - STORAGE_KEEP
    with _redis().pipeline() as pipe:
        try:
            pipe.watch(key)
            raw = pipe.get(key)
            if not raw:
                return  # no record: the next tick starts it from that day on
            state = json.loads(raw)
            start = max(_day(state["from"]), keep_from)
            next_day = _day(state["next"])
            sent = {d: mask for d, mask in state["sent"].items() if _day(d) >= start}
            events = []

            # Late hours: a row for a day already sent, whose hour that day's mask lacks.
            for hour, byte_hours in sorted(hours.items()):
                day = day_start(hour)
                if not start <= day < next_day or (first_allowed and day < first_allowed):
                    continue
                mask = sent.get(_day_key(day), 0)
                if mask & 1 << hour.hour:
                    continue
                sent[_day_key(day)] = mask | 1 << hour.hour
                if byte_hours > 0:
                    events.append(
                        build_storage_hour_adjustment_event(
                            project_id=project_id,
                            billing_account_id=billing_account_id,
                            hour=hour,
                            byte_seconds=byte_hours * 3600,
                            now=now,
                        )
                    )

            # Complete days. A day with no rows sends nothing, never a zero.
            day = next_day
            while complete_until and day < complete_until:
                if not first_allowed or day >= first_allowed:
                    day_hours = {h: v for h, v in hours.items() if day <= h < day + DAY}
                    mask = 0
                    for hour in day_hours:
                        mask |= 1 << hour.hour
                    if mask:
                        sent[_day_key(day)] = mask
                    byte_hours = sum(day_hours.values())
                    if byte_hours > 0:
                        events.append(
                            build_storage_day_event(
                                project_id=project_id,
                                billing_account_id=billing_account_id,
                                day=day,
                                byte_seconds=byte_hours * 3600,
                                now=now,
                            )
                        )
                day += DAY

            moved = {"from": _day_key(start), "next": _day_key(day), "sent": sent}
            if moved == state and not events:
                return
            pipe.multi()
            for event in events:
                pipe.hset(OUTBOX_KEY, event["id"], json.dumps(event))
            pipe.set(key, json.dumps(moved), ex=STORAGE_STATE_TTL_SECONDS)
            pipe.execute()
        except redis.WatchError:
            return  # another tick moved it: what is left goes on the next one


def emit_storage_usage(now: datetime) -> None:
    """Every Project with an ``acct_``: start a record for the ones new to the sender, then send
    what each one is due (``emit_project_storage``)."""
    r = _redis()
    accounts = dict(
        Project.objects.filter(billing_account_id__startswith="acct_").values_list(
            "pid", "billing_account_id"
        )
    )
    if not accounts:
        return

    # No record (a first deploy, a new acct_, Redis lost it): start at the current day, never an
    # earlier one. The worst a lost record does is leave a few days unbilled; a backfill could
    # bill them twice, under ids OpenMeter cannot dedupe.
    first_allowed = _first_storage_day()
    first = day_start(now) if not first_allowed else max(day_start(now), first_allowed)
    record = json.dumps({"from": _day_key(first), "next": _day_key(first), "sent": {}})
    keys = [STORAGE_STATE_KEY.format(pid) for pid in accounts]
    states = {}
    with r.pipeline(transaction=False) as pipe:
        for pid, key, raw in zip(accounts, keys, r.mget(keys)):
            if raw:
                states[pid] = json.loads(raw)
            else:
                pipe.set(key, record, nx=True, ex=STORAGE_STATE_TTL_SECONDS)
        pipe.execute()

    # Days end once the hourly task has metered their last hour, not when the clock says so.
    done = r.get(METER_STORAGE_HOUR_DONE_KEY)
    complete_until = day_start(parse_iso(done.decode())) if done else None
    due = {
        pid
        for pid, state in states.items()
        if complete_until and _day(state["next"]) < complete_until
    }

    hours = {}
    if due:
        hours = _storage_hours(
            project_id__in=due,
            interval_start__gte=min(_day(states[pid]["next"]) for pid in due),
            interval_start__lt=complete_until,
        )
    # Rows recorded since the last tick for a day already gone: late hours, if their bit is unset.
    cursor = r.get(STORAGE_LATE_CURSOR_KEY)
    since = (parse_iso(cursor.decode()) if cursor else now) - STORAGE_LATE_MARGIN
    # By Project, so the (project, recorded_at) index serves it: the ledger has none on its own.
    for pid, recorded in _storage_hours(
        project_id__in=list(states), recorded_at__gte=since, interval_start__lt=day_start(now)
    ).items():
        state = states.get(pid)
        if not state:
            continue
        late = {
            hour: byte_hours
            for hour, byte_hours in recorded.items()
            if day_start(hour) < _day(state["next"])
            and not state["sent"].get(_day_key(day_start(hour)), 0) & 1 << hour.hour
        }
        if late:
            hours.setdefault(pid, {}).update(late)

    for pid in sorted(due | set(hours)):
        try:
            emit_project_storage(pid, accounts[pid], hours.get(pid, {}), complete_until, now)
        except Exception:
            logger.exception("billing storage failed for project %s", pid)
    r.set(STORAGE_LATE_CURSOR_KEY, iso(now))


def emit_billing_usage_batch(now: Optional[datetime] = None) -> None:
    if not settings.OPENMETER_INGEST_URL:
        return
    if not (settings.BILLING_EMIT_ENABLED or settings.BILLING_STORAGE_EMIT_ENABLED):
        return
    now = now or timezone.now()
    if settings.BILLING_EMIT_ENABLED:
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
    if settings.BILLING_STORAGE_EMIT_ENABLED:
        try:
            emit_storage_usage(now)
        except Exception:
            logger.exception("billing storage usage failed")
    flush_outbox()
