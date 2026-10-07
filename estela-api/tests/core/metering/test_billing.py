"""Tests for :mod:`core.metering.billing` (usage CloudEvents to OpenMeter, ADR 0013)."""

import json
from datetime import datetime, timezone as dt_timezone
from io import StringIO
from pathlib import Path
from unittest.mock import MagicMock, patch

from django.core.management import CommandError, call_command
from django.test import SimpleTestCase, TestCase, override_settings

from core.metering import billing
from core.models import Project, Spider, SpiderJob

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
        self.strings, self.hashes = {}, {}

    def get(self, key):
        return self.strings.get(key)

    def set(self, key, value, ex=None):
        self.strings[key] = value.encode()

    def hset(self, key, field, value):
        self.hashes.setdefault(key, {})[field.encode()] = value.encode()

    def hgetall(self, key):
        return dict(self.hashes.get(key, {}))

    def hdel(self, key, *fields):
        for field in fields:
            self.hashes.get(key, {}).pop(field.encode(), None)

    def pipeline(self, transaction=True):
        return FakePipeline(self)


class FakePipeline:
    def __init__(self, r):
        self.r, self.calls = r, []

    def __getattr__(self, name):
        return lambda *args, **kwargs: self.calls.append((name, args, kwargs))

    def execute(self):
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
        self.assertEqual(self.project.billing_account_id, ACCT)
        post.assert_called_once_with(
            "http://registry.test/resolve",
            json={"zitadel_org_id": "393976771013247865"},
            headers={"Authorization": "Bearer t0ken"},
            timeout=10,
        )

    def test_account_id_can_be_set_directly_and_cleared(self):
        self._call("--account-id", ACCT)
        self.assertEqual(self.project.billing_account_id, ACCT)
        self._call("--clear")
        self.assertIsNone(self.project.billing_account_id)

    def test_rejects_a_malformed_account_id(self):
        with self.assertRaises(CommandError):
            self._call("--account-id", "acct_nope")
        self.assertIsNone(self.project.billing_account_id)

    def test_needs_exactly_one_source(self):
        with self.assertRaises(CommandError):
            self._call()
        with self.assertRaises(CommandError):
            self._call("393976771013247865", "--account-id", ACCT)
