from datetime import datetime, timedelta, timezone as dt_timezone

from django.test import TestCase

from core.metering.metrics import REPORTER_ESTELA, RESOURCE_KIND_SPIDER_JOB
from core.metering.report import append_metered_usage, ingest_metered_usage_report
from core.models import MeteredUsageRecord, Project


class IngestMeteredUsageReportTests(TestCase):
    def setUp(self):
        self.project = Project.objects.create(name="ingest-test")
        self.start = datetime(2026, 6, 5, 10, 0, 0, tzinfo=dt_timezone.utc)
        self.end = self.start + timedelta(minutes=15)

    def _payload(self, **overrides):
        data = {
            "resource_kind": "ScrapeJob",
            "resource_id": "scrape-job-789",
            "interval_start": self.start,
            "interval_end": self.end,
            "metrics": {
                "runtime_seconds": 900,
                "network_bytes": 52428800,
                "request_count": 1200,
            },
            "idempotency_key": "bitmaker-proxy:ScrapeJob:789:slice:3",
            "reporter": "bitmaker-proxy",
            "kind": MeteredUsageRecord.Kind.DELTA_SLICE,
        }
        data.update(overrides)
        return data

    def test_ingest_creates_row_with_metrics(self):
        record, created = ingest_metered_usage_report(
            self.project, self._payload()
        )
        self.assertTrue(created)
        self.assertEqual(record.project_id, self.project.pk)
        self.assertEqual(record.resource_kind, "ScrapeJob")
        self.assertEqual(record.metrics["network_bytes"], 52428800)
        self.assertEqual(record.reporter, "bitmaker-proxy")

    def test_duplicate_idempotency_key_returns_existing(self):
        ingest_metered_usage_report(self.project, self._payload())
        record, created = ingest_metered_usage_report(
            self.project, self._payload()
        )
        self.assertFalse(created)
        self.assertIsNotNone(record)

    def test_proxy_metrics_in_json(self):
        payload = self._payload(
            metrics={
                "proxy_bytes": 1000,
                "proxy_name": "acme-res",
            },
            idempotency_key="bitmaker-proxy:proxy:1",
        )
        record, _ = ingest_metered_usage_report(self.project, payload)
        self.assertEqual(record.metrics["proxy_bytes"], 1000)
        self.assertEqual(record.metrics["proxy_name"], "acme-res")

    def test_append_metered_usage_internal(self):
        record = append_metered_usage(
            project=self.project,
            resource_kind=RESOURCE_KIND_SPIDER_JOB,
            resource_id="7",
            kind=MeteredUsageRecord.Kind.DELTA_SLICE,
            metrics={"network_bytes": 7, "request_count": 0, "item_count": 0, "storage_bytes": 0},
            interval_start=self.start,
            interval_end=self.end,
            idempotency_key="estela:SpiderJob:7:sample:1",
            reporter=REPORTER_ESTELA,
        )
        self.assertEqual(record.resource_kind, RESOURCE_KIND_SPIDER_JOB)
        self.assertEqual(record.reporter, REPORTER_ESTELA)
