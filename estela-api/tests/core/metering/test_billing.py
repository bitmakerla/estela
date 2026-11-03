"""Tests for :mod:`core.metering.billing` (usage CloudEvents to OpenMeter, ADR 0013)."""

import json
from datetime import datetime, timedelta, timezone as dt_timezone
from io import StringIO
from pathlib import Path
from unittest.mock import MagicMock, patch

import redis
from django.conf import settings
from django.core.management import CommandError, call_command
from django.test import SimpleTestCase, TestCase, override_settings

from core.metering import billing
from core.metering import storage
from core.models import MeteredUsageRecord, Project, Spider, SpiderJob

FIXTURES = Path(__file__).parent / "fixtures" / "billing"
ACCT = "acct_01M49METSE3G6RCK09PZTEN9VB"


def _load(name):
    return json.loads((FIXTURES / name).read_text())


def _validator():
    from jsonschema import Draft202012Validator, RefResolver

    core = _load("usage-recorded.v1.json")
    profile = _load("estela.v1.json")
    # RefResolver, not `referencing`: the pinned attrs keeps jsonschema at 4.17.
    resolver = RefResolver.from_schema(profile, store={core["$id"]: core})
    return Draft202012Validator(
        profile, resolver=resolver, format_checker=Draft202012Validator.FORMAT_CHECKER
    )


def utc(*args):
    return datetime(*args, tzinfo=dt_timezone.utc)


class FakeRedis:
    """Just enough of redis-py for the sampler: strings, one hash, and pipelines."""

    def __init__(self):
        self.strings, self.hashes, self.ttls, self.sets = {}, {}, {}, {}
        self.on_watch = None

    def get(self, key):
        return self.strings.get(key)

    def mget(self, keys):
        return [self.strings.get(key) for key in keys]

    def set(self, key, value, ex=None, nx=False):
        if nx and key in self.strings:
            return
        self.strings[key] = value.encode()
        self.ttls[key] = ex

    def delete(self, *keys):
        for key in keys:
            self.strings.pop(key, None)

    def hset(self, key, field, value):
        self.hashes.setdefault(key, {})[field.encode()] = value.encode()

    def hgetall(self, key):
        return dict(self.hashes.get(key, {}))

    def hdel(self, key, *fields):
        for field in fields:
            self.hashes.get(key, {}).pop(field.encode(), None)

    def sadd(self, key, member):
        self.sets.setdefault(key, set()).add(member.encode())

    def srem(self, key, member):
        self.sets.get(key, set()).discard(member.encode())

    def smembers(self, key):
        return set(self.sets.get(key, set()))

    def pipeline(self, transaction=True):
        return FakePipeline(self)


class FakePipeline:
    """WATCH reads straight from the store; after MULTI, calls queue until EXECUTE, which
    raises WatchError if a watched key changed meanwhile (``on_watch`` lets a test change it)."""

    def __init__(self, r):
        self.r, self.calls, self.watched = r, [], {}

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.calls, self.watched = [], {}
        return False

    def watch(self, *keys):
        self.watched = {key: self.r.strings.get(key) for key in keys}
        if self.r.on_watch:
            self.r.on_watch(self.r)

    def get(self, key):
        return self.r.get(key)

    def multi(self):
        pass

    def __getattr__(self, name):
        return lambda *args, **kwargs: self.calls.append((name, args, kwargs))

    def execute(self):
        if any(self.r.strings.get(k) != v for k, v in self.watched.items()):
            raise redis.WatchError()
        for name, args, kwargs in self.calls:
            getattr(self.r, name)(*args, **kwargs)


class BuildSliceEventTests(SimpleTestCase):
    def _event(self, **overrides):
        fields = dict(
            job_id="6f1c2a",
            project_id="p_3fa9",
            billing_account_id="acct_01M3MXJASAFW9C5HCN4RNNBEQ3",
            machine_tier="MEDIUM",
            interval_start=utc(2026, 10, 1, 10, 5),
            interval_end=utc(2026, 10, 1, 10, 10),
            metrics={
                "runtime_seconds": 300,
                "network_bytes": 18462304,
                "request_count": 812,
                "item_count": 790,
            },
        )
        fields.update(overrides)
        return billing.build_slice_event(**fields)

    def test_matches_billings_example_except_for_the_id(self):
        expected = _load("estela-slice.json")
        event = self._event()
        self.assertEqual(event["id"], "estela:job:6f1c2a:slice:5969497:v1")
        event["id"] = expected["id"]
        self.assertEqual(event, expected)

    def test_is_valid_against_the_core_schema_and_estelas_profile(self):
        errors = list(_validator().iter_errors(self._event()))
        self.assertEqual(errors, [])

    def test_validator_catches_a_broken_event(self):
        event = self._event()
        event["data"]["metrics"]["runtime_seconds"] = "300"
        event["time"] = "2026-10-01T10:07:00Z"
        paths = {tuple(e.absolute_path) for e in _validator().iter_errors(event)}
        self.assertEqual(paths, {("data", "metrics", "runtime_seconds"), ("time",)})

    def test_id_is_deterministic_and_unique_per_window(self):
        a = self._event()["id"]
        self.assertEqual(a, self._event()["id"])
        later = self._event(interval_start=utc(2026, 10, 1, 10, 10))
        self.assertNotEqual(a, later["id"])

    def test_metrics_become_integers(self):
        event = self._event(metrics={"runtime_seconds": 299.6, "network_bytes": "10"})
        self.assertEqual(
            event["data"]["metrics"], {"runtime_seconds": 299, "network_bytes": 10}
        )

    def test_unknown_tier_is_left_out(self):
        event = self._event(machine_tier="GIGANTIC")
        self.assertNotIn("machine_tier", event["data"]["dimensions"])

    def test_slice_start_is_on_the_utc_five_minute_grid(self):
        self.assertEqual(
            billing.slice_start(utc(2026, 10, 1, 10, 9, 59, 999)),
            utc(2026, 10, 1, 10, 5),
        )
        self.assertEqual(
            billing.slice_start(utc(2026, 10, 1, 10, 10)), utc(2026, 10, 1, 10, 10)
        )


class DeliverTests(SimpleTestCase):
    events = [{"id": "a"}, {"id": "b"}, {"id": "c"}]

    def test_accepted_batch_keeps_nothing(self):
        post = MagicMock(return_value=202)
        self.assertEqual(billing.deliver(self.events, post), [])
        post.assert_called_once_with(self.events)

    def test_unreachable_or_5xx_keeps_everything(self):
        for status in (0, 500, 503):
            self.assertEqual(
                billing.deliver(self.events, MagicMock(return_value=status)),
                self.events,
            )

    def test_refused_batch_is_resent_one_by_one(self):
        answers = {"a": 202, "b": 400, "c": 503}
        post = MagicMock(
            side_effect=lambda evs: 400 if len(evs) > 1 else answers[evs[0]["id"]]
        )
        kept = billing.deliver(self.events, post)
        # b is malformed: dropped. c hit a transient error: kept for the next tick.
        self.assertEqual(kept, [{"id": "c"}])
        self.assertEqual(post.call_count, 4)


@override_settings(
    BILLING_EMIT_ENABLED=True,
    OPENMETER_INGEST_URL="http://openmeter.test/api/v3/openmeter/events",
)
class EmitBillingUsageBatchTests(TestCase):
    def setUp(self):
        self.project = Project.objects.create(name="billed", billing_account_id=ACCT)
        spider = Spider.objects.create(project=self.project, name="s")
        self.job = SpiderJob.objects.create(
            spider=spider, status=SpiderJob.RUNNING_STATUS, resource_tier="SMALL"
        )
        unbilled = Project.objects.create(name="unbilled")
        SpiderJob.objects.create(
            spider=Spider.objects.create(project=unbilled, name="s"),
            status=SpiderJob.RUNNING_STATUS,
        )
        self.redis = FakeRedis()
        self.counters = {}
        self.posted = []
        self.status = 202
        patches = [
            patch.object(billing, "_redis", return_value=self.redis),
            patch.object(
                billing, "read_scrapy_counters_from_redis", side_effect=self._read
            ),
            patch.object(billing, "post_events", side_effect=self._post),
        ]
        for p in patches:
            p.start()
            self.addCleanup(p.stop)

    def _read(self, job):
        return self.counters.get(job.jid)

    def _post(self, events):
        self.posted.append(events)
        return self.status

    def _tick(self, *at, **counters):
        self.counters[self.job.jid] = counters
        billing.emit_billing_usage_batch(now=utc(*at))

    def _outbox(self):
        return self.redis.hgetall(billing.OUTBOX_KEY)

    def test_only_projects_with_an_account_are_emitted(self):
        self._tick(
            2026, 10, 6, 12, 0, 3, elapsed_time_seconds=120.4, total_response_bytes=500
        )
        (batch,) = self.posted
        (event,) = batch
        self.assertEqual(event["subject"], ACCT)
        self.assertEqual(event["data"]["resource_id"], str(self.job.jid))
        self.assertEqual(event["data"]["dimensions"]["machine_tier"], "SMALL")
        self.assertEqual(event["data"]["interval_start"], "2026-10-06T11:55:00Z")
        self.assertEqual(event["data"]["interval_end"], "2026-10-06T12:00:00Z")
        self.assertEqual(
            event["data"]["metrics"],
            {
                "runtime_seconds": 120,
                "network_bytes": 500,
                "request_count": 0,
                "item_count": 0,
            },
        )
        self.assertEqual(list(_validator().iter_errors(event)), [])
        self.assertEqual(self._outbox(), {})

    def test_slices_are_increments_not_running_totals(self):
        self._tick(2026, 10, 6, 12, 0, 3, elapsed_time_seconds=100, item_count=10)
        self._tick(2026, 10, 6, 12, 5, 2, elapsed_time_seconds=400, item_count=25)
        second = self.posted[1][0]
        self.assertEqual(second["data"]["metrics"]["runtime_seconds"], 300)
        self.assertEqual(second["data"]["metrics"]["item_count"], 15)
        self.assertEqual(second["time"], "2026-10-06T12:00:00Z")

    def test_no_usage_sends_nothing(self):
        self._tick(2026, 10, 6, 12, 0, 3, elapsed_time_seconds=100)
        self._tick(2026, 10, 6, 12, 5, 2, elapsed_time_seconds=100)
        self.assertEqual(len(self.posted), 1)

    def test_a_rerun_in_the_same_window_does_not_lose_usage(self):
        self._tick(2026, 10, 6, 12, 0, 3, elapsed_time_seconds=100)
        self._tick(2026, 10, 6, 12, 0, 40, elapsed_time_seconds=137)
        self._tick(2026, 10, 6, 12, 5, 1, elapsed_time_seconds=400)
        sent = [batch[0]["data"]["metrics"]["runtime_seconds"] for batch in self.posted]
        self.assertEqual(sent, [100, 300])

    def test_failed_delivery_is_retried_with_the_same_id(self):
        self.status = 503
        self._tick(2026, 10, 6, 12, 0, 3, elapsed_time_seconds=100)
        self.assertEqual(len(self._outbox()), 1)
        self.status = 202
        self._tick(2026, 10, 6, 12, 5, 2, elapsed_time_seconds=400)
        retried = {event["id"]: event for event in self.posted[1]}
        self.assertEqual(
            set(retried),
            {e["id"] for e in self.posted[0]}
            | {billing.slice_event_id(self.job.jid, utc(2026, 10, 6, 12, 0))},
        )
        self.assertEqual(self._outbox(), {})

    @override_settings(BILLING_EMIT_ENABLED=False)
    def test_disabled_does_nothing(self):
        self._tick(2026, 10, 6, 12, 0, 3, elapsed_time_seconds=100)
        self.assertEqual(self.posted, [])
        self.assertEqual(self.redis.strings, {})


@override_settings(
    BILLING_EMIT_ENABLED=True,
    OPENMETER_INGEST_URL="http://openmeter.test/api/v3/openmeter/events",
)
class JobCloseAdjustmentTests(TestCase):
    """What a job used after its last tick, sent once at close (omx-6uu.7)."""

    setUp = EmitBillingUsageBatchTests.setUp
    _read = EmitBillingUsageBatchTests._read
    _post = EmitBillingUsageBatchTests._post
    _tick = EmitBillingUsageBatchTests._tick
    _outbox = EmitBillingUsageBatchTests._outbox

    def _finish(self, *, runtime, network=0, requests=0, items=0):
        # update(), not save(): save() fires the post_save that schedules the real close.
        SpiderJob.objects.filter(pk=self.job.pk).update(
            status=SpiderJob.COMPLETED_STATUS,
            lifespan=timedelta(seconds=runtime),
            total_response_bytes=network,
            request_count=requests,
            item_count=items,
        )
        self.job.refresh_from_db()

    def _close(self, *at):
        billing.emit_job_close_adjustment(self.job, now=utc(*at))

    def _sent(self):
        return [event for batch in self.posted for event in batch]

    def _baseline(self):
        raw = self.redis.get(billing.LAST_SAMPLE_KEY.format(self.job.key))
        return json.loads(raw) if raw else None

    def test_sends_what_came_after_the_last_slice(self):
        # Job 15223 on staging, 2026-10-07: the 14:45 tick was its last.
        self._tick(
            2026, 10, 7, 14, 45, 0,
            elapsed_time_seconds=2170, total_response_bytes=24484065,
            request_count=375, item_count=314,
        )
        self._finish(runtime=2314, network=26104134, requests=383, items=314)
        self._close(2026, 10, 7, 14, 48, 0)

        slice_, adjustment = self._sent()
        self.assertEqual(adjustment["id"], f"estela:job:{self.job.jid}:adjust:close:v1")
        self.assertEqual(adjustment["time"], "2026-10-07T14:48:00Z")
        data = adjustment["data"]
        self.assertEqual(data["kind"], "ADJUSTMENT")
        self.assertEqual(data["references_id"], f"estela:job:{self.job.jid}:close:v1")
        self.assertEqual(data["interval_start"], "2026-10-07T14:45:00Z")
        self.assertEqual(data["interval_end"], "2026-10-07T14:48:00Z")
        self.assertEqual(data["dimensions"]["machine_tier"], "SMALL")
        # Only what is left: items were all sent already, so they are not in it.
        self.assertEqual(
            data["metrics"],
            {"runtime_seconds": 144, "network_bytes": 1620069, "request_count": 8},
        )
        self.assertEqual(list(_validator().iter_errors(adjustment)), [])
        # Slices plus adjustment come to the job's final totals.
        total = {
            m: slice_["data"]["metrics"][m] + data["metrics"].get(m, 0)
            for m in slice_["data"]["metrics"]
        }
        self.assertEqual(
            total,
            {"runtime_seconds": 2314, "network_bytes": 26104134,
             "request_count": 383, "item_count": 314},
        )
        self.assertEqual(self._outbox(), {})
        self.assertTrue(self._baseline()["closed"])

    def test_a_job_no_tick_saw_sends_its_whole_usage(self):
        self._finish(runtime=170, network=5000, requests=12, items=9)
        billing.emit_job_close_adjustment(
            self.job, now=self.job.created + timedelta(minutes=3)
        )
        (event,) = self._sent()
        self.assertEqual(
            event["data"]["metrics"],
            {"runtime_seconds": 170, "network_bytes": 5000, "request_count": 12, "item_count": 9},
        )
        self.assertEqual(event["data"]["interval_start"], billing.iso(self.job.created))
        self.assertEqual(list(_validator().iter_errors(event)), [])

    def test_the_baseline_outlives_a_running_job_and_any_gap_in_the_ticks(self):
        """A baseline that expires under a running Job bills everything it used all over again."""
        self._tick(2026, 10, 7, 14, 45, 0, elapsed_time_seconds=300, item_count=40)
        key = billing.LAST_SAMPLE_KEY.format(self.job.key)
        self.assertGreater(self.redis.ttls[key], 7 * 24 * 3600)

    def test_the_close_shortens_it_again(self):
        self._tick(2026, 10, 7, 14, 45, 0, elapsed_time_seconds=300, item_count=40)
        self._finish(runtime=400, items=50)
        self._close(2026, 10, 7, 14, 52, 0)
        key = billing.LAST_SAMPLE_KEY.format(self.job.key)
        self.assertEqual(self.redis.ttls[key], billing.CLOSED_SAMPLE_TTL_SECONDS)

    def test_a_repeated_close_sends_nothing_more(self):
        self._finish(runtime=170, network=5000)
        self._close(2026, 10, 7, 14, 48, 0)
        self._close(2026, 10, 7, 14, 49, 0)
        self.assertEqual(len(self._sent()), 1)

    def test_a_tick_after_the_close_does_nothing(self):
        # A tick that loaded the job while it was still RUNNING reaches it after the close.
        self._finish(runtime=170, network=5000)
        self._close(2026, 10, 7, 14, 48, 0)
        self.counters[self.job.jid] = {"elapsed_time_seconds": 175, "total_response_bytes": 5100}
        billing.sample_job(self.job, utc(2026, 10, 7, 14, 45), utc(2026, 10, 7, 14, 50))
        self.assertEqual(len(self._sent()), 1)
        self.assertEqual(self._outbox(), {})

    def test_a_tick_that_moves_the_baseline_meanwhile_is_read_again(self):
        self._tick(2026, 10, 7, 14, 40, 0, elapsed_time_seconds=1870)
        self._finish(runtime=2314)
        key = billing.LAST_SAMPLE_KEY.format(self.job.key)

        def tick_lands(r):
            r.on_watch = None
            r.set(key, json.dumps({"elapsed_time_seconds": 2170, "window_end": "2026-10-07T14:45:00Z"}))

        self.redis.on_watch = tick_lands
        self._close(2026, 10, 7, 14, 48, 0)
        adjustment = self._sent()[-1]
        self.assertEqual(adjustment["data"]["metrics"], {"runtime_seconds": 144})
        self.assertEqual(adjustment["data"]["interval_start"], "2026-10-07T14:45:00Z")

    def test_a_tick_that_loses_to_the_close_queues_nothing(self):
        self._tick(2026, 10, 7, 14, 40, 0, elapsed_time_seconds=1870)
        key = billing.LAST_SAMPLE_KEY.format(self.job.key)

        def close_lands(r):
            r.on_watch = None
            r.set(key, json.dumps({"elapsed_time_seconds": 2314, "closed": True}))

        self.redis.on_watch = close_lands
        self._tick(2026, 10, 7, 14, 45, 0, elapsed_time_seconds=2170)
        self.assertEqual(len(self._sent()), 1)  # only the 14:40 slice
        self.assertEqual(self._outbox(), {})

    def test_a_final_total_under_what_was_sent_takes_nothing_back(self):
        self._tick(2026, 10, 7, 14, 45, 0, elapsed_time_seconds=300, item_count=40)
        self._finish(runtime=290, items=40, network=900)
        self._close(2026, 10, 7, 14, 48, 0)
        adjustment = self._sent()[-1]
        self.assertEqual(adjustment["data"]["metrics"], {"network_bytes": 900})

    def test_a_row_whose_stats_were_never_copied_does_not_erase_the_slices(self):
        # Stopped or found dead while Redis was down: the row keeps zeros (except: pass).
        self._tick(2026, 10, 7, 14, 45, 0, elapsed_time_seconds=300, total_response_bytes=5000)
        self._finish(runtime=0)
        self._close(2026, 10, 7, 14, 48, 0)
        self.assertEqual(len(self._sent()), 1)  # the slice only
        self.assertTrue(self._baseline()["closed"])

    def test_nothing_left_sends_nothing_but_closes(self):
        self._tick(2026, 10, 7, 14, 45, 0, elapsed_time_seconds=300, item_count=40)
        self._finish(runtime=300, items=40)
        self._close(2026, 10, 7, 14, 48, 0)
        self.assertEqual(len(self._sent()), 1)
        self.assertTrue(self._baseline()["closed"])

    def test_a_project_without_an_account_sends_nothing(self):
        Project.objects.filter(pk=self.project.pk).update(billing_account_id=None)
        self._finish(runtime=170, network=5000)
        self._close(2026, 10, 7, 14, 48, 0)
        self.assertEqual(self.posted, [])
        self.assertEqual(self.redis.strings, {})

    @override_settings(BILLING_EMIT_ENABLED=False)
    def test_disabled_does_nothing(self):
        self._finish(runtime=170, network=5000)
        self._close(2026, 10, 7, 14, 48, 0)
        self.assertEqual(self.posted, [])
        self.assertEqual(self.redis.strings, {})

    def test_a_job_reaching_a_final_status_schedules_the_close(self):
        with patch("core.signals.emit_billing_job_close") as task, patch(
            "core.signals.get_chain_to_process_usage_data"
        ), patch("core.signals.record_job_coverage_event"):
            self.job.status = SpiderJob.COMPLETED_STATUS
            self.job.save()
        task.apply_async.assert_called_once_with(
            args=[self.job.jid],
            countdown=settings.COUNTDOWN_RECORD_PROJECT_USAGE_AFTER_JOB_EVENT,
        )


@override_settings(
    ACCOUNT_REGISTRY_URL="http://registry.test/", ACCOUNT_REGISTRY_TOKEN="t0ken"
)
class SetProjectBillingOwnerTests(TestCase):
    def setUp(self):
        self.project = Project.objects.create(name="p")

    def _call(self, *args):
        call_command(
            "set_project_billing_owner", str(self.project.pid), *args, stdout=StringIO()
        )
        self.project.refresh_from_db()

    @patch("core.metering.billing.requests.post")
    def test_resolves_the_org_through_the_registry(self, post):
        post.return_value.json.return_value = {
            "billing_account_id": ACCT,
            "minted": False,
        }
        self._call("393976771013247865")
        self.assertEqual(
            (self.project.owner_org_id, self.project.billing_account_id),
            ("393976771013247865", ACCT),
        )
        post.assert_called_once_with(
            "http://registry.test/resolve",
            json={"zitadel_org_id": "393976771013247865"},
            headers={"Authorization": "Bearer t0ken"},
            timeout=10,
        )

    def test_a_project_set_by_hand_gets_its_owner_when_the_acct_matches(self):
        """staging's billing-test: an acct_ set before owners existed, and no owner Org."""
        Project.objects.filter(pk=self.project.pk).update(billing_account_id=ACCT)
        with patch(
            "core.management.commands.set_project_billing_owner.resolve_billing_account",
            return_value=ACCT,
        ):
            self._call("393976771013247865")
        self.assertEqual(self.project.owner_org_id, "393976771013247865")

    def test_an_acct_set_by_hand_for_another_org_is_refused(self):
        Project.objects.filter(pk=self.project.pk).update(billing_account_id=ACCT)
        with patch(
            "core.management.commands.set_project_billing_owner.resolve_billing_account",
            return_value="acct_01M4J7DSWSQ0C678WDJYS0NFR4",
        ), self.assertRaises(CommandError):
            self._call("another-org")
        self.project.refresh_from_db()
        self.assertEqual((self.project.owner_org_id, self.project.billing_account_id), (None, ACCT))

    def test_the_owner_never_moves(self):
        Project.objects.filter(pk=self.project.pk).update(
            owner_org_id="393976771013247865", billing_account_id=ACCT
        )
        with patch(
            "core.management.commands.set_project_billing_owner.resolve_billing_account"
        ) as resolve:
            self._call("393976771013247865")  # the same Org: nothing to do
            with self.assertRaises(CommandError):
                self._call("another-org")
        resolve.assert_not_called()
        self.assertEqual(self.project.owner_org_id, "393976771013247865")

    def test_needs_an_org(self):
        with self.assertRaises(CommandError):
            self._call()


OTHER_ACCT = "acct_01M4J7DSWSQ0C678WDJYS0NFR4"


@override_settings(
    BILLING_EMIT_ENABLED=False,
    BILLING_STORAGE_EMIT_ENABLED=True,
    METERED_USAGE_STORAGE_HOURLY_ENABLED=True,
    OPENMETER_INGEST_URL="http://openmeter.test/api/v3/openmeter/events",
)
class StorageEmitTests(TestCase):
    """A Project's storage, sent by the hourly storage task: one event per hour, or one over the
    gap after missed runs, and no ledger row."""

    def setUp(self):
        self.project = Project.objects.create(name="stores", billing_account_id=ACCT)
        self.unbilled = Project.objects.create(name="no-acct")
        self.redis = FakeRedis()
        self.posted = []
        self.status = 202
        self.sizes = {}
        db_client = MagicMock()
        db_client.get_connection.return_value = True
        for p in (
            patch.object(billing, "_redis", return_value=self.redis),
            patch.object(storage, "_redis", return_value=self.redis),
            patch.object(billing, "post_events", side_effect=self._post),
            patch.object(storage, "spiderdata_db_client", db_client),
            patch.object(
                storage,
                "get_project_spiderdata_storage_bytes",
                side_effect=lambda pid: self.sizes.get(pid),
            ),
        ):
            p.start()
            self.addCleanup(p.stop)

    def _post(self, events):
        self.posted.append(events)
        return self.status(events) if callable(self.status) else self.status

    def _sent(self):
        return [event for batch in self.posted for event in batch]

    def _measured(self, project, bytes_end, *covered):
        """The watermark a previous run left: the size it saw and the end of the hour it covered."""
        self.redis.set(
            storage._last_sample_key(project.pk),
            json.dumps(
                {
                    "observed_at": billing.iso(utc(*covered) + timedelta(minutes=5)),
                    "storage_bytes_end": bytes_end,
                    "covered_until": utc(*covered).isoformat(),
                }
            ),
        )

    def _run(self, *at, **sizes):
        """The hourly task runs at ``at``, each Project holding ``sizes[name]`` bytes."""
        projects = {p.name: p for p in (self.project, self.unbilled)}
        projects.update({p.name: p for p in Project.objects.filter(name__in=sizes)})
        for name, size in sizes.items():
            self.sizes[str(projects[name].pid)] = size
            self.redis.sadd(storage.METER_STORAGE_ACTIVE_PROJECTS_KEY, str(projects[name].pk))
        before = len(self._sent())
        storage.record_hourly_storage_metered_usage_batch(reference=utc(*at))
        return self._sent()[before:]

    def _watermark(self, project):
        raw = self.redis.get(storage._last_sample_key(project.pk))
        return json.loads(raw) if raw else None

    def test_an_hour_is_one_slice_of_its_byte_hours_times_3600(self):
        self._measured(self.project, 400_000, 2026, 11, 3, 10)

        (event,) = self._run(2026, 11, 3, 11, 5, stores=1_000_000)

        pid = self.project.pid
        self.assertEqual(
            event["id"], f"estela:project:{pid}:storage:hour:2026-11-03T10:00:00Z:v1"
        )
        self.assertEqual(event["subject"], ACCT)
        self.assertEqual(event["time"], "2026-11-03T10:00:00Z")
        self.assertEqual(event["data"]["kind"], "DELTA_SLICE")
        self.assertEqual(event["data"]["resource_kind"], "project_storage")
        self.assertEqual(event["data"]["resource_id"], str(pid))
        self.assertEqual(event["data"]["interval_start"], "2026-11-03T10:00:00Z")
        self.assertEqual(event["data"]["interval_end"], "2026-11-03T11:00:00Z")
        self.assertEqual(event["data"]["dimensions"], {"project_id": str(pid)})
        # (400,000 + 1,000,000) // 2 byte-hours, in byte-seconds.
        self.assertEqual(event["data"]["metrics"], {"storage_byte_seconds": 700_000 * 3600})
        self.assertIsInstance(event["data"]["metrics"]["storage_byte_seconds"], int)
        _validator().validate(event)

        self.assertEqual(MeteredUsageRecord.objects.count(), 0)
        self.assertEqual(self.redis.hgetall(billing.OUTBOX_KEY), {})
        watermark = self._watermark(self.project)
        self.assertEqual(watermark["storage_bytes_end"], 1_000_000)
        self.assertEqual(watermark["covered_until"], "2026-11-03T11:00:00+00:00")

    def test_hours_in_a_row_are_one_event_each(self):
        self._measured(self.project, 1_000, 2026, 11, 3, 10)
        self._run(2026, 11, 3, 11, 5, stores=3_000)
        (event,) = self._run(2026, 11, 3, 12, 5, stores=5_000)
        self.assertEqual(event["data"]["interval_start"], "2026-11-03T11:00:00Z")
        self.assertEqual(event["data"]["metrics"], {"storage_byte_seconds": 4_000 * 3600})
        self.assertEqual(len(self._sent()), 2)

    @override_settings(BILLING_STORAGE_EMIT_ENABLED=False)
    def test_switched_off_it_writes_the_ledger_row_and_sends_nothing(self):
        self._measured(self.project, 400_000, 2026, 11, 3, 10)

        self.assertEqual(self._run(2026, 11, 3, 11, 5, stores=1_000_000), [])

        row = MeteredUsageRecord.objects.get(project=self.project)
        self.assertEqual(row.metrics["storage_byte_hours"], 700_000)
        self.assertEqual(self.redis.hgetall(billing.OUTBOX_KEY), {})

    def test_a_project_without_an_acct_keeps_its_ledger_row_and_sends_nothing(self):
        self._measured(self.unbilled, 400_000, 2026, 11, 3, 10)

        self.assertEqual(self._run(2026, 11, 3, 11, 5, **{"no-acct": 1_000_000}), [])

        row = MeteredUsageRecord.objects.get(project=self.unbilled)
        self.assertEqual(row.metrics["storage_byte_hours"], 700_000)
        # Its watermark keeps moving, so the hour it gets an acct_ is its first billed one.
        self.assertEqual(
            self._watermark(self.unbilled)["covered_until"], "2026-11-03T11:00:00+00:00"
        )
        self.unbilled.billing_account_id = OTHER_ACCT
        self.unbilled.save()
        (event,) = self._run(2026, 11, 3, 12, 5, **{"no-acct": 1_000_000})
        self.assertEqual(event["data"]["interval_start"], "2026-11-03T11:00:00Z")

    def test_missed_hours_go_as_one_event_over_the_gap(self):
        self._measured(self.project, 1_000_000, 2026, 11, 3, 10)

        with self.assertLogs(storage.logger, level="WARNING") as logs:
            (event,) = self._run(2026, 11, 3, 13, 5, stores=3_000_000)

        pid = self.project.pid
        # Named by the last hour it covers; stamped at its start, inside the open period.
        self.assertEqual(
            event["id"], f"estela:project:{pid}:storage:hour:2026-11-03T12:00:00Z:v1"
        )
        self.assertEqual(event["data"]["kind"], "DELTA_SLICE")
        self.assertEqual(event["time"], "2026-11-03T10:00:00Z")
        self.assertEqual(event["data"]["interval_start"], "2026-11-03T10:00:00Z")
        self.assertEqual(event["data"]["interval_end"], "2026-11-03T13:00:00Z")
        # (1,000,000 + 3,000,000) // 2 × 3 hours.
        self.assertEqual(
            event["data"]["metrics"], {"storage_byte_seconds": 6_000_000 * 3600}
        )
        _validator().validate(event)
        self.assertIn("not measured for 3 hours", logs.output[0])

    def test_one_missed_run_is_not_warned_about(self):
        self._measured(self.project, 1_000, 2026, 11, 3, 10)
        with patch.object(storage.logger, "warning") as warning:
            (event,) = self._run(2026, 11, 3, 12, 5, stores=1_000)
        self.assertEqual(event["data"]["interval_start"], "2026-11-03T10:00:00Z")
        warning.assert_not_called()

    def test_a_gap_across_a_month_end_is_an_adjustment_stamped_now(self):
        self._measured(self.project, 1_000, 2026, 10, 31, 22)

        (event,) = self._run(2026, 11, 1, 2, 5, stores=3_000)

        pid = self.project.pid
        self.assertEqual(
            event["id"], f"estela:project:{pid}:storage:hour:2026-11-01T01:00:00Z:adjust:v1"
        )
        self.assertEqual(event["data"]["kind"], "ADJUSTMENT")
        self.assertEqual(event["time"], "2026-11-01T02:05:00Z")
        self.assertEqual(event["data"]["interval_start"], "2026-10-31T22:00:00Z")
        self.assertEqual(event["data"]["interval_end"], "2026-11-01T02:00:00Z")
        self.assertEqual(
            event["data"]["references_id"],
            f"estela:project:{pid}:storage:hour:2026-11-01T01:00:00Z:v1",
        )
        self.assertEqual(event["data"]["metrics"], {"storage_byte_seconds": 2_000 * 4 * 3600})
        _validator().validate(event)

    def test_a_months_last_hour_is_a_slice_on_time_and_an_adjustment_late(self):
        self._measured(self.project, 1_000, 2026, 10, 31, 23)
        (on_time,) = self._run(2026, 11, 1, 0, 5, stores=1_000)
        self.assertEqual(on_time["data"]["kind"], "DELTA_SLICE")
        self.assertEqual(on_time["time"], "2026-10-31T23:00:00Z")

        other = Project.objects.create(name="late", billing_account_id=OTHER_ACCT)
        self._measured(other, 1_000, 2026, 10, 31, 23)
        (late,) = self._run(2026, 11, 1, 0, 45, late=1_000)
        self.assertEqual(late["data"]["kind"], "ADJUSTMENT")
        self.assertEqual(late["time"], "2026-11-01T00:45:00Z")
        self.assertEqual(late["data"]["interval_start"], "2026-10-31T23:00:00Z")
        _validator().validate(late)

    def test_a_rerun_of_the_same_hour_sends_nothing(self):
        self._measured(self.project, 1_000, 2026, 11, 3, 10)
        self.assertEqual(len(self._run(2026, 11, 3, 11, 5, stores=1_000)), 1)
        self.assertEqual(self._run(2026, 11, 3, 11, 40, stores=2_000), [])
        self.assertEqual(self._watermark(self.project)["storage_bytes_end"], 1_000)

    def test_a_run_racing_another_one_queues_nothing(self):
        self._measured(self.project, 1_000, 2026, 11, 3, 10)

        # Another run rewrites the watermark between this one's WATCH and its EXEC.
        def other_run(r):
            r.on_watch = None
            self._measured(self.project, 5_000, 2026, 11, 3, 10)

        self.redis.on_watch = other_run
        self.assertEqual(self._run(2026, 11, 3, 11, 5, stores=1_000), [])
        self.assertEqual(self.redis.hgetall(billing.OUTBOX_KEY), {})
        self.assertEqual(self._watermark(self.project)["storage_bytes_end"], 5_000)

    def test_a_project_seen_for_the_first_time_starts_on_the_current_hour(self):
        (event,) = self._run(2026, 11, 3, 11, 5, stores=1_000)
        self.assertEqual(event["data"]["interval_start"], "2026-11-03T10:00:00Z")
        self.assertEqual(event["data"]["interval_end"], "2026-11-03T11:00:00Z")
        self.assertEqual(event["data"]["metrics"], {"storage_byte_seconds": 1_000 * 3600})

    def test_a_lost_watermark_never_bills_an_hour_twice(self):
        (first,) = self._run(2026, 11, 3, 11, 5, stores=1_000)
        self.redis.delete(storage._last_sample_key(self.project.pk))
        # Measured again from cold, the hour gets the same id, which OpenMeter dedupes.
        (again,) = self._run(2026, 11, 3, 11, 30, stores=1_000)
        self.assertEqual(again["id"], first["id"])

    def test_no_storage_sends_nothing_and_forgets_the_project(self):
        self._measured(self.project, 0, 2026, 11, 3, 10)
        self.assertEqual(self._run(2026, 11, 3, 11, 5, stores=0), [])
        self.assertIsNone(self._watermark(self.project))
        self.assertEqual(self.redis.smembers(storage.METER_STORAGE_ACTIVE_PROJECTS_KEY), set())

    def test_storage_emptied_in_the_hour_is_billed_down_to_zero(self):
        self._measured(self.project, 2_000_000, 2026, 11, 3, 10)
        (event,) = self._run(2026, 11, 3, 11, 5, stores=0)
        self.assertEqual(event["data"]["metrics"], {"storage_byte_seconds": 1_000_000 * 3600})

    def test_a_refused_send_is_resent_unchanged_by_the_next_tick(self):
        self._measured(self.project, 1_000, 2026, 11, 3, 10)
        self.status = 503
        (first,) = self._run(2026, 11, 3, 11, 5, stores=1_000)
        self.assertEqual(len(self.redis.hgetall(billing.OUTBOX_KEY)), 1)

        # The 5-minute tick flushes it, storage switched on and jobs off.
        self.status = 202
        billing.emit_billing_usage_batch(now=utc(2026, 11, 3, 11, 10))
        self.assertEqual(self.posted[-1], [first])
        self.assertEqual(self.redis.hgetall(billing.OUTBOX_KEY), {})

    def test_a_batch_refused_with_400_is_resent_event_by_event(self):
        other = Project.objects.create(name="also-stores", billing_account_id=OTHER_ACCT)
        self._measured(self.project, 1_000, 2026, 11, 3, 10)
        self._measured(other, 1_000, 2026, 11, 3, 10)
        # The batch is refused; alone, the first Project's hour is accepted and the other's refused.
        self.status = lambda events: (
            202 if len(events) == 1 and events[0]["subject"] == ACCT else 400
        )

        self._run(2026, 11, 3, 11, 5, stores=1_000, **{"also-stores": 1_000})

        self.assertEqual([len(batch) for batch in self.posted], [2, 1, 1])
        self.assertEqual(self.redis.hgetall(billing.OUTBOX_KEY), {})

    @override_settings(OPENMETER_INGEST_URL="")
    def test_without_an_ingest_url_it_writes_the_ledger_row(self):
        self.assertEqual(self._run(2026, 11, 3, 11, 5, stores=1_000), [])
        self.assertEqual(MeteredUsageRecord.objects.filter(project=self.project).count(), 1)
