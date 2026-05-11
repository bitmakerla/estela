from datetime import datetime, timedelta, timezone as dt_timezone
from decimal import Decimal

_POINT_EPS = timedelta(microseconds=1)

from django.db.models.signals import post_save
from django.test import TestCase, override_settings
from unittest.mock import patch

from core import signals as core_signals
from core.models import (
    MeteredUsageRecord,
    Project,
    Spider,
    SpiderCronJob,
    SpiderJob,
)
from core.metering.ledger import (
    append_metered_usage_for_data_delete,
    append_metered_usage_for_job_close,
    create_metered_usage_idempotent,
)


class LedgerTests(TestCase):
    """Ledger unit tests for flow rows (DELTA_SLICE accrual + close-time
    reconcile + DATA_DELETE audit marker).

    ``delta_storage_bytes`` on close is read from Redis via
    ``api.utils.read_scrapy_counters_from_redis`` (patched in tests).
    """

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

    @override_settings(METERED_USAGE_HOURLY_ENABLED=False)
    @patch(
        "api.utils.read_scrapy_counters_from_redis",
        return_value={"storage_obj_bytes_total": 0},
    )
    def test_job_close_appends_single_row_when_hourly_disabled(self, _mock_redis):
        close_ts = datetime(2026, 2, 1, 11, 22, 33, tzinfo=dt_timezone.utc)
        with patch("core.metering.ledger.timezone.now", return_value=close_ts):
            append_metered_usage_for_job_close(self.job, self.project)
        rows = MeteredUsageRecord.objects.filter(job=self.job)
        self.assertEqual(rows.count(), 1)
        row = rows.get()
        self.assertEqual(row.project_id, self.project.pk)
        self.assertEqual(row.job_id, self.job.pk)
        self.assertEqual(row.spider_id, self.spider.pk)
        self.assertEqual(row.kind, MeteredUsageRecord.Kind.JOB_CLOSE)
        self.assertEqual(row.delta_network_bytes, 1000)
        self.assertEqual(row.delta_item_count, 10)
        self.assertEqual(row.delta_request_count, 50)
        self.assertEqual(row.idempotency_key, f"job:{self.job.jid}:close:v3")
        self.assertEqual(row.delta_storage_bytes, 0)
        self.assertIsNone(row.delta_proxy_bytes)
        self.assertEqual(row.proxy_name, "")
        self.assertEqual(row.interval_start, close_ts)
        self.assertEqual(row.interval_end, close_ts + _POINT_EPS)

    @override_settings(METERED_USAGE_HOURLY_ENABLED=False)
    @patch(
        "api.utils.read_scrapy_counters_from_redis",
        return_value={
            "storage_obj_bytes_total": 0,
            "meter_proxy_redis_bytes": 333,
        },
    )
    def test_job_close_non_hourly_proxy_from_redis(self, _mock_redis):
        self.job.proxy_usage_data = {"proxy_name": "acme-res"}
        self.job.save(update_fields=["proxy_usage_data"])
        append_metered_usage_for_job_close(self.job, self.project)
        row = MeteredUsageRecord.objects.get(job=self.job)
        self.assertEqual(row.delta_proxy_bytes, 333)
        self.assertEqual(row.proxy_name, "acme-res")

    def test_idempotent_second_insert_skipped(self):
        kw = dict(
            idempotency_key="test-key-1",
            project=self.project,
            job=self.job,
            spider=self.spider,
            kind=MeteredUsageRecord.Kind.JOB_CLOSE,
            delta_network_bytes=1,
            delta_request_count=0,
            delta_item_count=0,
        )
        r1 = create_metered_usage_idempotent(**kw)
        r2 = create_metered_usage_idempotent(**kw)
        self.assertIsNotNone(r1)
        self.assertIsNone(r2)
        self.assertEqual(MeteredUsageRecord.objects.count(), 1)
        self.assertEqual(r1.project_id, self.project.pk)
        self.assertIsNone(r1.delta_proxy_bytes)
        self.assertEqual(r1.proxy_name, "")

    @override_settings(METERED_USAGE_HOURLY_ENABLED=True)
    @patch(
        "api.utils.read_scrapy_counters_from_redis",
        return_value={
            "storage_obj_bytes_total": 0,
            "meter_proxy_redis_bytes": 0,
        },
    )
    def test_job_close_hourly_writes_only_reconcile_adjustment(self, _mock_redis):
        """Under hourly mode, JOB_CLOSE writes no marker row; the only close-time
        row is the ADJUSTMENT carrying flow residuals (incl. runtime)."""
        self.job.proxy_usage_data = {"proxy_name": "hourly-close-proxy"}
        self.job.save(update_fields=["proxy_usage_data"])
        MeteredUsageRecord.objects.create(
            project=self.project,
            job=self.job,
            spider=self.spider,
            kind=MeteredUsageRecord.Kind.DELTA_SLICE,
            interval_start=self.job.created,
            interval_end=self.job.created,
            delta_network_bytes=400,
            delta_request_count=20,
            delta_item_count=4,
            idempotency_key=f"job:{self.job.jid}:hour:test:v1",
        )
        append_metered_usage_for_job_close(self.job, self.project)

        kinds = sorted(
            MeteredUsageRecord.objects.values_list("kind", flat=True)
        )
        self.assertEqual(
            kinds,
            sorted(
                [
                    MeteredUsageRecord.Kind.DELTA_SLICE,
                    MeteredUsageRecord.Kind.ADJUSTMENT,
                ]
            ),
        )
        adj = MeteredUsageRecord.objects.get(
            kind=MeteredUsageRecord.Kind.ADJUSTMENT
        )
        self.assertEqual(adj.delta_network_bytes, 600)
        self.assertEqual(adj.delta_request_count, 30)
        self.assertEqual(adj.delta_item_count, 6)
        self.assertEqual(
            adj.delta_runtime_seconds,
            Decimal(str(self.job.lifespan.total_seconds())),
        )
        self.assertIsNone(adj.delta_proxy_bytes)
        self.assertEqual(adj.proxy_name, "hourly-close-proxy")
        self.assertEqual(
            adj.adjustment_reason,
            MeteredUsageRecord.AdjustmentReason.RECONCILE_SCRAPY_FINAL,
        )
        self.assertEqual(adj.delta_storage_bytes, 0)
        delta_slice = MeteredUsageRecord.objects.get(
            kind=MeteredUsageRecord.Kind.DELTA_SLICE
        )
        self.assertEqual(adj.interval_start, delta_slice.interval_end)
        self.assertEqual(adj.interval_end, delta_slice.interval_end + _POINT_EPS)

    @override_settings(METERED_USAGE_HOURLY_ENABLED=True)
    @patch(
        "api.utils.read_scrapy_counters_from_redis",
        return_value={
            "storage_obj_bytes_total": 0,
            "meter_proxy_redis_bytes": 500,
        },
    )
    def test_job_close_proxy_reconcile_uses_redis_meter_proxy(self, _mock_redis):
        """Final proxy total for reconcile is cumulative meter_proxy_redis_bytes from Redis."""
        MeteredUsageRecord.objects.create(
            project=self.project,
            job=self.job,
            spider=self.spider,
            kind=MeteredUsageRecord.Kind.DELTA_SLICE,
            delta_network_bytes=1000,
            delta_request_count=50,
            delta_item_count=10,
            delta_proxy_bytes=300,
            idempotency_key=f"job:{self.job.jid}:hour:proxy:v1",
        )
        self.job.proxy_usage_data = {"proxy_name": "final-proxy"}
        self.job.save(update_fields=["proxy_usage_data"])
        append_metered_usage_for_job_close(self.job, self.project)
        adj = MeteredUsageRecord.objects.get(kind=MeteredUsageRecord.Kind.ADJUSTMENT)
        self.assertEqual(adj.delta_proxy_bytes, 200)
        self.assertEqual(adj.proxy_name, "final-proxy")

    @override_settings(METERED_USAGE_HOURLY_ENABLED=True)
    @patch(
        "api.utils.read_scrapy_counters_from_redis",
        return_value={
            "storage_obj_bytes_total": 500,
            "meter_proxy_redis_bytes": 400,
        },
    )
    def test_job_close_storage_residual_only_uses_reconcile_storage_reason(
        self, _mock_redis
    ):
        MeteredUsageRecord.objects.create(
            project=self.project,
            job=self.job,
            spider=self.spider,
            kind=MeteredUsageRecord.Kind.DELTA_SLICE,
            delta_network_bytes=1000,
            delta_request_count=50,
            delta_item_count=10,
            delta_storage_bytes=400,
            delta_proxy_bytes=400,
            delta_runtime_seconds=42,
            idempotency_key=f"job:{self.job.jid}:hour:storage-only:v1",
        )
        append_metered_usage_for_job_close(self.job, self.project)
        adj = MeteredUsageRecord.objects.get(kind=MeteredUsageRecord.Kind.ADJUSTMENT)
        self.assertEqual(adj.delta_storage_bytes, 100)
        self.assertEqual(adj.delta_network_bytes, 0)
        self.assertEqual(
            adj.adjustment_reason,
            MeteredUsageRecord.AdjustmentReason.RECONCILE_STORAGE,
        )

    @override_settings(METERED_USAGE_HOURLY_ENABLED=True)
    @patch(
        "api.utils.read_scrapy_counters_from_redis",
        return_value={
            "storage_obj_bytes_total": 0,
            "meter_proxy_redis_bytes": 400,
        },
    )
    def test_job_close_no_row_when_slices_already_reconcile(self, _mock_redis):
        """If DELTA_SLICE rows already match Scrapy/proxy/lifespan finals, JOB_CLOSE
        writes nothing — no marker row, no ADJUSTMENT."""
        MeteredUsageRecord.objects.create(
            project=self.project,
            job=self.job,
            spider=self.spider,
            kind=MeteredUsageRecord.Kind.DELTA_SLICE,
            delta_network_bytes=1000,
            delta_request_count=50,
            delta_item_count=10,
            delta_proxy_bytes=400,
            delta_runtime_seconds=42,
            idempotency_key=f"job:{self.job.jid}:hour:proxy:match:v1",
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

    @override_settings(METERED_USAGE_HOURLY_ENABLED=True)
    @patch(
        "api.utils.read_scrapy_counters_from_redis",
        return_value={"storage_obj_bytes_total": 0},
    )
    def test_job_close_hourly_picks_latest_slice_interval_end_for_attribution(
        self, _mock_redis
    ):
        early = datetime(2026, 3, 1, 8, 15, tzinfo=dt_timezone.utc)
        late = datetime(2026, 3, 1, 14, 45, tzinfo=dt_timezone.utc)
        for interval_end, suffix, net in (
            (early, "a", 100),
            (late, "b", 200),
        ):
            MeteredUsageRecord.objects.create(
                project=self.project,
                job=self.job,
                spider=self.spider,
                kind=MeteredUsageRecord.Kind.DELTA_SLICE,
                interval_start=interval_end - timedelta(minutes=5),
                interval_end=interval_end,
                delta_network_bytes=net,
                delta_request_count=1,
                delta_item_count=1,
                idempotency_key=f"job:{self.job.jid}:hour:{suffix}:v1",
            )
        append_metered_usage_for_job_close(self.job, self.project)
        adj = MeteredUsageRecord.objects.get(
            kind=MeteredUsageRecord.Kind.ADJUSTMENT
        )
        self.assertEqual(adj.interval_start, late)
        self.assertEqual(adj.interval_end, late + _POINT_EPS)

    @override_settings(METERED_USAGE_HOURLY_ENABLED=False)
    @patch(
        "api.utils.read_scrapy_counters_from_redis",
        return_value={"storage_obj_bytes_total": 0},
    )
    def test_job_close_mirrors_cronjob_on_flow_rows(self, _mock_redis):
        """Flow rows (JOB_CLOSE here, ADJUSTMENT under hourly) should mirror
        ``job.cronjob`` so per-cronjob analytics queries in the billing module
        can group flow + stock by ``cronjob_id`` uniformly.
        """
        cj = SpiderCronJob.objects.create(spider=self.spider, schedule="* * * * *")
        SpiderJob.objects.filter(pk=self.job.pk).update(cronjob=cj)
        self.job.refresh_from_db()
        append_metered_usage_for_job_close(self.job, self.project)
        row = MeteredUsageRecord.objects.get(
            kind=MeteredUsageRecord.Kind.JOB_CLOSE
        )
        self.assertEqual(row.cronjob_id, cj.cjid)

    def test_data_delete_writes_marker_with_no_deltas(self):
        self.job.proxy_usage_data = {"proxy_name": "deleted-job-proxy"}
        self.job.save(update_fields=["proxy_usage_data"])
        delete_ts = datetime(2026, 4, 1, 9, 8, 7, tzinfo=dt_timezone.utc)
        with patch("core.metering.ledger.timezone.now", return_value=delete_ts):
            append_metered_usage_for_data_delete(self.job, self.project)
        row = MeteredUsageRecord.objects.get(kind=MeteredUsageRecord.Kind.DATA_DELETE)
        self.assertEqual(row.project_id, self.project.pk)
        self.assertEqual(row.job_id, self.job.pk)
        self.assertEqual(row.spider_id, self.spider.pk)
        self.assertEqual(row.delta_network_bytes, 0)
        self.assertEqual(row.delta_request_count, 0)
        self.assertEqual(row.delta_item_count, 0)
        self.assertIsNone(row.delta_proxy_bytes)
        self.assertIsNone(row.delta_runtime_seconds)
        self.assertEqual(row.proxy_name, "deleted-job-proxy")
        self.assertEqual(row.interval_start, delete_ts)
        self.assertEqual(row.interval_end, delete_ts + _POINT_EPS)
