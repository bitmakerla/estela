"""The usage gate (ADR 0016 in bitmaker-cloud-openmeter, omx-8q5.4.16): a Job starts only for an Org
whose Billing state is active or internal, read from the Account Registry and cached by the outage
policy; checked when a Job is created through the API and again when a queued Job is dispatched."""

import json
from unittest.mock import MagicMock, patch

import requests
from django.test import TestCase, override_settings

from core.metering import gate
from core.models import Project, Spider, SpiderJob, UserProfile
from core.tasks import run_spider_jobs
from tests.base import BaseTestCase

ACCT = "acct_01M49METSE3G6RCK09PZTEN9VB"
NOW = 1_800_000_000.0
HOUR = 3600
GATE = dict(
    USAGE_GATE_ENABLED=True,
    ACCOUNT_REGISTRY_URL="http://registry.test",
    ACCOUNT_REGISTRY_TOKEN="t",
    USAGE_GATE_FRESH_SECONDS=120,
    USAGE_GATE_LAST_KNOWN_GOOD_SECONDS=24 * HOUR,
    BILLING_ACCOUNT_PAGE_URL="https://billing.example/account/",
)


class FakeRedis:
    def __init__(self):
        self.strings = {}

    def get(self, key):
        return self.strings.get(key)

    def set(self, key, value, ex=None):
        self.strings[key] = value.encode()


def answer(state=None, status=200):
    response = MagicMock(status_code=status)
    response.json.return_value = {"billing_account_id": ACCT, "billing_state": state}
    return response


class GateTestCase(TestCase):
    def setUp(self):
        self.redis = FakeRedis()
        patcher = patch("core.metering.gate._redis", return_value=self.redis)
        patcher.start()
        self.addCleanup(patcher.stop)
        self.project = Project.objects.create(name="p", billing_account_id=ACCT)

    def check(self, now=NOW):
        gate.check_job_may_start(self.project, now=now)

    def refused(self, now=NOW):
        with self.assertRaises(gate.UsageRefused) as caught:
            self.check(now)
        return caught.exception


@override_settings(**GATE)
@patch("core.metering.gate.requests.get")
class BillingStateTests(GateTestCase):
    def test_active_and_internal_start(self, get):
        for state in ("active", "internal"):
            with self.subTest(state=state):
                self.redis.strings.clear()
                get.return_value = answer(state)
                self.check()
        get.assert_called_with(
            f"http://registry.test/accounts/{ACCT}",
            headers={"Authorization": "Bearer t"},
            timeout=5,
        )

    def test_an_org_whose_billing_is_not_set_up_is_refused(self, get):
        """Awaiting its card, never onboarded (no state), or unknown to the Registry (404)."""
        for response in (answer("awaiting_card"), answer(None), answer(status=404)):
            with self.subTest(response=response):
                self.redis.strings.clear()
                get.return_value = response
                refusal = self.refused()
                self.assertEqual(refusal.reason, gate.NOT_SET_UP)
                self.assertIn("https://billing.example/account/", refusal.message)
                self.assertFalse(refusal.transient)

    def test_a_stopped_org_is_refused(self, get):
        get.return_value = answer("stopped")
        self.assertEqual(self.refused().reason, gate.STOPPED)

    def test_an_org_with_no_card_and_no_credit_is_refused_and_told_why(self, get):
        """ADR 0019, ADR 0021: no card and no credit left, a brand-new Org included, starts no new
        Jobs until a card, bought credit or a Prepayment."""
        get.return_value = answer("out_of_credit")
        refusal = self.refused()
        self.assertEqual(refusal.reason, gate.OUT_OF_CREDIT)
        self.assertIn("add a card or buy credit", refusal.message)
        self.assertIn("https://billing.example/account/", refusal.message)
        self.assertFalse(refusal.transient)

    def test_a_project_with_no_acct_is_refused_without_asking(self, get):
        Project.objects.filter(pk=self.project.pk).update(billing_account_id=None)
        self.project.refresh_from_db()
        self.assertEqual(self.refused().reason, gate.NO_OWNER)
        get.assert_not_called()

    @override_settings(USAGE_GATE_ENABLED=False)
    def test_off_nothing_is_checked(self, get):
        Project.objects.filter(pk=self.project.pk).update(billing_account_id=None)
        self.project.refresh_from_db()
        self.check()
        get.assert_not_called()

    def test_a_fresh_answer_is_used_as_it_is(self, get):
        get.return_value = answer("active")
        self.check(NOW)
        self.check(NOW + 119)
        self.assertEqual(get.call_count, 1)

    def test_a_stopped_org_stops_within_the_fresh_period(self, get):
        get.return_value = answer("active")
        self.check(NOW)
        get.return_value = answer("stopped")
        self.check(NOW + 60)                       # still the cached answer
        self.assertEqual(self.refused(NOW + 121).reason, gate.STOPPED)

    def test_when_the_registry_cannot_answer_last_seen_active_keeps_starting_for_24h(self, get):
        get.return_value = answer("active")
        self.check(NOW)
        get.side_effect = requests.ConnectionError("registry down")
        self.check(NOW + 23 * HOUR)
        refusal = self.refused(NOW + 25 * HOUR)
        self.assertEqual(refusal.reason, gate.UNAVAILABLE)
        self.assertTrue(refusal.transient)

    def test_when_the_registry_cannot_answer_anything_else_is_refused(self, get):
        get.return_value = answer("awaiting_card")
        self.assertEqual(self.refused(NOW).reason, gate.NOT_SET_UP)
        get.side_effect = requests.Timeout("slow")
        self.assertEqual(self.refused(NOW + 300).reason, gate.UNAVAILABLE)
        self.redis.strings.clear()                 # never seen at all
        self.assertEqual(self.refused(NOW + 300).reason, gate.UNAVAILABLE)

    def test_an_error_answer_counts_as_cannot_answer(self, get):
        """A 5xx, or a refused credential: the last-known-good state still holds."""
        get.return_value = answer("internal")
        self.check(NOW)
        for status in (500, 503, 401, 403):
            with self.subTest(status=status):
                get.return_value = answer(status=status)
                self.check(NOW + HOUR)

    def test_without_redis_it_still_asks_the_registry(self, get):
        broken = MagicMock()
        broken.get.side_effect = broken.set.side_effect = ConnectionError("no redis")
        with patch("core.metering.gate._redis", return_value=broken):
            get.return_value = answer("active")
            self.check()
            get.return_value = answer("stopped")
            self.assertEqual(self.refused().reason, gate.STOPPED)

    def test_the_cache_is_kept_past_the_last_known_good_period(self, get):
        get.return_value = answer("active")
        self.check(NOW)
        key = gate.STATE_KEY.format(ACCT)
        self.assertEqual(json.loads(self.redis.strings[key]), {"state": "active", "at": NOW})


@override_settings(**GATE)
@patch("core.metering.gate.requests.get")
class JobCreationTests(BaseTestCase):
    resource = "job-list"

    def setUp(self):
        super().setUp()
        self.redis = FakeRedis()
        patcher = patch("core.metering.gate._redis", return_value=self.redis)
        patcher.start()
        self.addCleanup(patcher.stop)
        self.project = self.user.project_set.create(
            name="p", billing_account_id=ACCT, through_defaults={"permission": "OWNER"}
        )
        self.spider = Spider.objects.create(project=self.project, name="s")
        self.url_kwargs = {"pid": self.project.pid, "sid": self.spider.sid}

    def create(self, status_code):
        return self.make_request(
            method="POST", user=self.user, url_kwargs=self.url_kwargs,
            data={"data_status": "PERSISTENT"}, status_code=status_code,
        )

    def test_an_org_whose_billing_is_set_up_runs_its_job(self, get):
        get.return_value = answer("active")
        self.assertEqual(self.create(201)["job_status"], SpiderJob.IN_QUEUE_STATUS)

    def test_a_refused_job_is_not_created_and_says_why(self, get):
        get.return_value = answer("awaiting_card")
        body = self.create(403)
        self.assertEqual((body["code"], body["reason"]), ("usage_gate", gate.NOT_SET_UP))
        self.assertIn("Billing is not set up yet", body["detail"])
        self.assertFalse(SpiderJob.objects.exists())

    def test_a_registry_that_cannot_answer_is_a_503(self, get):
        get.side_effect = requests.ConnectionError("registry down")
        self.assertEqual(self.create(503)["reason"], gate.UNAVAILABLE)
        self.assertFalse(SpiderJob.objects.exists())

    @patch("api.views.job.job_manager")
    def test_a_sync_run_is_gated_too(self, job_manager, get):
        get.return_value = answer("stopped")
        self.make_request(
            method="POST", user=self.user, url_kwargs=self.url_kwargs,
            data={"data_status": "PERSISTENT"}, params={"sync": "true"}, status_code=403,
        )
        job_manager.create_job.assert_not_called()


@override_settings(**GATE)
@patch("core.metering.gate.requests.get")
@patch("core.tasks._get_cluster_resources", return_value=(12.0, 32e9, 0.0, 0.0))
@patch("core.tasks.redis.from_url")
@patch("core.tasks._dispatch_single_job")
@patch("core.tasks.write_job_logs_to_mongo")
class DispatchTests(BaseTestCase):
    """Queued Jobs, ad hoc and scheduled (a scheduled run is queued like any other), are checked
    when the dispatcher would start them: the Org may have stopped since."""

    def setUp(self):
        super().setUp()
        self.redis = FakeRedis()
        # A refused Job ends as ERROR, which schedules what every ended Job does (usage from
        # MongoDB, coverage, billing's close): not this test's subject.
        for target, kwargs in (
            ("core.metering.gate._redis", {"return_value": self.redis}),
            ("core.signals.get_chain_to_process_usage_data", {}),
            ("core.signals.record_job_coverage_event", {}),
            ("core.signals.emit_billing_job_close", {}),
        ):
            patcher = patch(target, **kwargs)
            patcher.start()
            self.addCleanup(patcher.stop)
        UserProfile.objects.filter(user=self.user).update(memory_quota=1e9)
        project = self.user.project_set.create(
            name="p", billing_account_id=ACCT, through_defaults={"permission": "OWNER"}
        )
        spider = Spider.objects.create(project=project, name="s")
        self.job = SpiderJob.objects.create(spider=spider, status=SpiderJob.IN_QUEUE_STATUS)

    def test_a_job_of_a_set_up_org_is_dispatched(self, logs, dispatch, lock, cluster, get):
        get.return_value = answer("active")
        run_spider_jobs()
        dispatch.assert_called_once()
        self.assertEqual(dispatch.call_args.args[0].jid, self.job.jid)

    def test_a_refused_job_ends_with_the_reason_in_its_log(self, logs, dispatch, lock, cluster, get):
        get.return_value = answer("stopped")
        run_spider_jobs()
        dispatch.assert_not_called()
        self.job.refresh_from_db()
        self.assertEqual(self.job.status, SpiderJob.ERROR_STATUS)
        self.assertIn("stopped", logs.call_args.args[1])

    def test_one_refused_org_does_not_hold_up_another(self, logs, dispatch, lock, cluster, get):
        other_acct = "acct_01M4J7DSWSQ0C678WDJYS0NFR4"
        other = self.user.project_set.create(
            name="q", billing_account_id=other_acct, through_defaults={"permission": "OWNER"}
        )
        other_job = SpiderJob.objects.create(
            spider=Spider.objects.create(project=other, name="s"),
            status=SpiderJob.IN_QUEUE_STATUS,
        )
        get.side_effect = lambda url, **kw: answer("active" if url.endswith(other_acct) else "awaiting_card")
        run_spider_jobs()
        self.assertEqual([c.args[0].jid for c in dispatch.call_args_list], [other_job.jid])
