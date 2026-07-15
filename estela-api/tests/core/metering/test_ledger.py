from datetime import datetime, timedelta, timezone as dt_timezone
from decimal import Decimal

_POINT_EPS = timedelta(microseconds=1)

from django.db.models.signals import post_save
from django.test import TestCase, override_settings
from unittest.mock import patch

from core import signals as core_signals
from core.metering.metrics import REPORTER_ESTELA, RESOURCE_KIND_SPIDER_JOB, build_flow_metrics
from core.models import (
    MeteredUsageRecord,
    Project,
    Spider,
    SpiderJob,
)
from core.metering.ledger import (
    append_metered_usage_for_data_delete,
    append_metered_usage_for_job_close,
    create_metered_usage_idempotent,
)


def _slice_metrics(**kwargs):
    return build_flow_metrics(**kwargs)


class LedgerTests(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        post_save.disconnect(sender=SpiderJob, dispatch_uid="update_usage")

    @classmethod
    def tearDownClass(cls):
        post_save.connect(
            core_signals.update_usage,
            sender=SpiderJob,
            dispatch_uid="update_usage",
        )
        super().tearDownClass()

    def setUp(self):
        self.project = Project.objects.create(name="meter-test-project")
        self.spider = Spider.objects.create(project=self.project, name="s")
        self.job = SpiderJob.objects.create(
            spider=self.spider,
            status=SpiderJob.COMPLETED_STATUS,
            lifespan=timedelta(seconds=42),
            total_response_bytes=1000,
            item_count=10,
            request_count=50,
            proxy_usage_data={},
        )
        self.resource_id = str(self.job.jid)

    def _rows_for_job(self):
        return MeteredUsageRecord.objects.filter(
            project=self.project,
            resource_kind=RESOURCE_KIND_SPIDER_JOB,
            resource_id=self.resource_id,
        )

    @override_settings(METERED_USAGE_HOURLY_ENABLED=False)
    @patch(
        "api.utils.read_scrapy_counters_from_redis",
        return_value={"storage_obj_bytes_total": 0},
    )
    def test_job_close_appends_single_row_when_hourly_disabled(self, _mock_redis):
        close_ts = datetime(2026, 2, 1, 11, 22, 33, tzinfo=dt_timezone.utc)
        with patch("core.metering.ledger.timezone.now", return_value=close_ts):
            append_metered_usage_for_job_close(self.job, self.project)
        rows = self._rows_for_job()
        self.assertEqual(rows.count(), 1)
        row = rows.get()
        self.assertEqual(row.kind, MeteredUsageRecord.Kind.JOB_CLOSE)
        self.assertEqual(row.metrics["network_bytes"], 1000)
        self.assertEqual(row.reporter, REPORTER_ESTELA)
        self.assertNotIn("proxy_bytes", row.metrics)
        self.assertEqual(row.idempotency_key, f"estela:SpiderJob:{self.job.jid}:close:v4")
        self.assertEqual(row.interval_start, close_ts)

    @override_settings(METERED_USAGE_HOURLY_ENABLED=False)
    @patch(
        "api.utils.read_scrapy_counters_from_redis",
        return_value={
            "storage_obj_bytes_total": 0,
            "meter_proxy_redis_bytes": 333,
        },
    )
    def test_job_close_does_not_write_proxy_bytes(self, _mock_redis):
        self.job.proxy_usage_data = {"proxy_name": "acme-res"}
        self.job.save(update_fields=["proxy_usage_data"])
        append_metered_usage_for_job_close(self.job, self.project)
        row = self._rows_for_job().get()
        self.assertNotIn("proxy_bytes", row.metrics)
        self.assertNotIn("proxy_name", row.metrics)

    def test_idempotent_second_insert_skipped(self):
        kw = dict(
            idempotency_key="test-key-1",
            project=self.project,
            resource_kind=RESOURCE_KIND_SPIDER_JOB,
            resource_id=self.resource_id,
            kind=MeteredUsageRecord.Kind.JOB_CLOSE,
            metrics=_slice_metrics(network_bytes=1),
        )
        r1 = create_metered_usage_idempotent(**kw)
        r2 = create_metered_usage_idempotent(**kw)
        self.assertIsNotNone(r1)
        self.assertIsNone(r2)

    @override_settings(METERED_USAGE_HOURLY_ENABLED=True)
    @patch(
        "api.utils.read_scrapy_counters_from_redis",
        return_value={"storage_obj_bytes_total": 0},
    )
    def test_job_close_hourly_writes_only_reconcile_adjustment(self, _mock_redis):
        MeteredUsageRecord.objects.create(
            project=self.project,
            resource_kind=RESOURCE_KIND_SPIDER_JOB,
            resource_id=self.resource_id,
            reporter=REPORTER_ESTELA,
            kind=MeteredUsageRecord.Kind.DELTA_SLICE,
            interval_start=self.job.created,
            interval_end=self.job.created,
            metrics=_slice_metrics(
                network_bytes=400, request_count=20, item_count=4
            ),
            idempotency_key=f"estela:SpiderJob:{self.job.jid}:hour:test:v1",
        )
        append_metered_usage_for_job_close(self.job, self.project)
        adj = MeteredUsageRecord.objects.get(
            kind=MeteredUsageRecord.Kind.ADJUSTMENT
        )
        self.assertEqual(adj.metrics["network_bytes"], 600)
        self.assertEqual(adj.metrics["request_count"], 30)

    @override_settings(METERED_USAGE_HOURLY_ENABLED=True)
    @patch(
        "api.utils.read_scrapy_counters_from_redis",
        return_value={"storage_obj_bytes_total": 500},
    )
    def test_job_close_storage_residual_only(self, _mock_redis):
        MeteredUsageRecord.objects.create(
            project=self.project,
            resource_kind=RESOURCE_KIND_SPIDER_JOB,
            resource_id=self.resource_id,
            reporter=REPORTER_ESTELA,
            kind=MeteredUsageRecord.Kind.DELTA_SLICE,
            metrics=_slice_metrics(
                network_bytes=1000,
                request_count=50,
                item_count=10,
                storage_bytes=400,
                runtime_seconds=42,
            ),
            idempotency_key=f"estela:SpiderJob:{self.job.jid}:hour:storage:v1",
        )
        append_metered_usage_for_job_close(self.job, self.project)
        adj = MeteredUsageRecord.objects.get(kind=MeteredUsageRecord.Kind.ADJUSTMENT)
        self.assertEqual(adj.metrics["storage_bytes"], 100)
        self.assertEqual(adj.metrics["network_bytes"], 0)
        self.assertEqual(
            adj.adjustment_reason,
            MeteredUsageRecord.AdjustmentReason.RECONCILE_STORAGE,
        )

    @override_settings(METERED_USAGE_HOURLY_ENABLED=True)
    @patch(
        "api.utils.read_scrapy_counters_from_redis",
        return_value={"storage_obj_bytes_total": 0},
    )
    def test_job_close_no_row_when_slices_already_reconcile(self, _mock_redis):
        MeteredUsageRecord.objects.create(
            project=self.project,
            resource_kind=RESOURCE_KIND_SPIDER_JOB,
            resource_id=self.resource_id,
            reporter=REPORTER_ESTELA,
            kind=MeteredUsageRecord.Kind.DELTA_SLICE,
            metrics=_slice_metrics(
                network_bytes=1000,
                request_count=50,
                item_count=10,
                runtime_seconds=42,
            ),
            idempotency_key=f"estela:SpiderJob:{self.job.jid}:hour:match:v1",
        )
        append_metered_usage_for_job_close(self.job, self.project)
        self.assertFalse(
            MeteredUsageRecord.objects.filter(
                kind__in=[
                    MeteredUsageRecord.Kind.JOB_CLOSE,
                    MeteredUsageRecord.Kind.ADJUSTMENT,
                ]
            ).exists()
        )

    def test_data_delete_writes_marker_with_zero_flow(self):
        delete_ts = datetime(2026, 4, 1, 9, 8, 7, tzinfo=dt_timezone.utc)
        with patch("core.metering.ledger.timezone.now", return_value=delete_ts):
            append_metered_usage_for_data_delete(self.job, self.project)
        row = MeteredUsageRecord.objects.get(kind=MeteredUsageRecord.Kind.DATA_DELETE)
        self.assertEqual(row.metrics["network_bytes"], 0)
        self.assertNotIn("proxy_bytes", row.metrics)
