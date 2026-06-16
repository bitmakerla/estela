from datetime import datetime, timedelta, timezone as dt_timezone

from core.models import MeteredUsageRecord, Project
from tests.base import BaseTestCase


class MeteringReportTests(BaseTestCase):
    resource = "metering-report"

    def setUp(self):
        super().setUp()
        self.project = self.user.project_set.create(
            name="metering-api-test", through_defaults={"permission": "OWNER"}
        )
        self.start = datetime(2026, 6, 5, 10, 0, 0, tzinfo=dt_timezone.utc)
        self.end = self.start + timedelta(minutes=15)

    def _payload(self, **overrides):
        data = {
            "project_id": str(self.project.pid),
            "resource_kind": "ScrapeJob",
            "resource_id": "scrape-job-789",
            "interval_start": self.start.isoformat().replace("+00:00", "Z"),
            "interval_end": self.end.isoformat().replace("+00:00", "Z"),
            "metrics": {
                "runtime_seconds": 900,
                "network_bytes": 52428800,
                "request_count": 1200,
            },
            "idempotency_key": "bitmaker-proxy:ScrapeJob:789:slice:3",
            "reporter": "bitmaker-proxy",
        }
        data.update(overrides)
        return data

    def test_report_creates_ledger_row(self):
        response = self.make_request(
            method="POST",
            user=self.user,
            data=self._payload(),
            status_code=201,
        )
        self.assertFalse(response["duplicate"])
        self.assertEqual(response["resource_kind"], "ScrapeJob")
        record = MeteredUsageRecord.objects.get(id=response["id"])
        self.assertEqual(record.reporter, "bitmaker-proxy")
        self.assertEqual(record.metrics["network_bytes"], 52428800)

    def test_duplicate_returns_200(self):
        self.make_request(
            method="POST",
            user=self.user,
            data=self._payload(),
            status_code=201,
        )
        response = self.make_request(
            method="POST",
            user=self.user,
            data=self._payload(),
            status_code=200,
        )
        self.assertTrue(response["duplicate"])
        self.assertEqual(
            MeteredUsageRecord.objects.filter(
                idempotency_key="bitmaker-proxy:ScrapeJob:789:slice:3"
            ).count(),
            1,
        )

    def test_non_member_forbidden(self):
        other = self.user.__class__.objects.create_user(username="other-user")
        self.make_request(
            method="POST",
            user=other,
            data=self._payload(),
            status_code=403,
        )

    def test_unauthenticated(self):
        self.make_request(
            method="POST",
            data=self._payload(),
            status_code=401,
        )

    def test_unknown_project(self):
        payload = self._payload(project_id="00000000-0000-0000-0000-000000000099")
        self.make_request(
            method="POST",
            user=self.user,
            data=payload,
            status_code=400,
        )
