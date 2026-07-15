"""Tests for hourly trapezoidal project spiderdata retention metering."""

import json
from datetime import datetime, timedelta, timezone as dt_timezone
from unittest.mock import MagicMock, patch

from django.test import TestCase, override_settings

from core.metering.metrics import (
    METRIC_STORAGE_BYTE_HOURS,
    METRIC_STORAGE_BYTES_END,
    METRIC_STORAGE_BYTES_START,
    RESOURCE_KIND_PROJECT_STORAGE,
)
from core.metering.storage import (
    bootstrap_storage_meter_watermarks,
    previous_utc_hour_interval,
    process_hourly_storage_metered_usage_for_project,
    record_hourly_storage_metered_usage_batch,
    resolve_storage_bytes_start,
    trapezoidal_storage_byte_hours,
)
from core.models import DataStatus, MeteredUsageRecord, Project, Spider, SpiderJob


@override_settings(METERED_USAGE_STORAGE_HOURLY_ENABLED=True)
class HourlyStorageMeteringTests(TestCase):
    def setUp(self):
        self.project = Project.objects.create(name="storage-meter-test")
        self.spider = Spider.objects.create(project=self.project, name="s")
        self.job = SpiderJob.objects.create(
            spider=self.spider,
            status=SpiderJob.COMPLETED_STATUS,
            data_status=DataStatus.PERSISTENT_STATUS,
        )
        self.hour_start = datetime(2026, 6, 12, 10, 0, 0, tzinfo=dt_timezone.utc)
        self.hour_end = self.hour_start + timedelta(hours=1)
        self.observed_at = datetime(2026, 6, 12, 11, 5, 0, tzinfo=dt_timezone.utc)

    def tearDown(self):
        import core.metering.storage as storage_mod

        storage_mod._CLIENT = None

    def test_previous_utc_hour_interval(self):
        ref = datetime(2026, 6, 12, 11, 5, 0, tzinfo=dt_timezone.utc)
        hour_start, hour_end = previous_utc_hour_interval(ref)
        self.assertEqual(hour_start, self.hour_start)
        self.assertEqual(hour_end, datetime(2026, 6, 12, 11, 0, 0, tzinfo=dt_timezone.utc))

    def test_trapezoidal_storage_byte_hours(self):
        self.assertEqual(trapezoidal_storage_byte_hours(0, 1_000_000), 500_000)
        self.assertEqual(trapezoidal_storage_byte_hours(1_000_000, 1_000_000), 1_000_000)
        self.assertEqual(trapezoidal_storage_byte_hours(2_000_000, 0), 1_000_000)

    def test_cold_start_uses_bytes_end_as_start(self):
        self.assertEqual(
            resolve_storage_bytes_start(
                self.project,
                bytes_end=500,
                hour_start=self.hour_start,
                prev_sample=None,
            ),
            500,
        )

    @patch("core.metering.storage._redis")
    @patch("core.metering.storage.get_project_spiderdata_storage_bytes")
    def test_hourly_trapezoid_row(self, mock_get_size, mock_redis):
        mock_get_size.return_value = 1_000_000
        mock_conn = MagicMock()
        mock_conn.get.return_value = json.dumps(
            {"observed_at": "2026-06-12T10:00:00+00:00", "storage_bytes_end": 400_000}
        ).encode()
        mock_redis.return_value = mock_conn

        process_hourly_storage_metered_usage_for_project(
            self.project,
            hour_start=self.hour_start,
            hour_end=self.hour_end,
            observed_at=self.observed_at,
        )

        row = MeteredUsageRecord.objects.get(
            resource_kind=RESOURCE_KIND_PROJECT_STORAGE,
            resource_id=str(self.project.pid),
        )
        self.assertEqual(row.kind, MeteredUsageRecord.Kind.DELTA_SLICE)
        self.assertEqual(row.interval_start, self.hour_start)
        self.assertEqual(row.interval_end, self.hour_end)
        self.assertEqual(row.metrics[METRIC_STORAGE_BYTES_END], 1_000_000)
        self.assertEqual(row.metrics[METRIC_STORAGE_BYTES_START], 400_000)
        self.assertEqual(row.metrics[METRIC_STORAGE_BYTE_HOURS], 700_000)
        self.assertEqual(
            row.idempotency_key,
            f"estela:ProjectStorage:{self.project.pid}:storage:hour:2026-06-12T10:00:00Z:v3",
        )
        mock_conn.set.assert_called()

    @patch("core.metering.storage._mark_project_storage_inactive")
    @patch("core.metering.storage.get_project_spiderdata_storage_bytes")
    def test_zero_storage_skips_ledger_row(self, mock_get_size, mock_inactive):
        mock_get_size.return_value = 0

        process_hourly_storage_metered_usage_for_project(
            self.project,
            hour_start=self.hour_start,
            hour_end=self.hour_end,
        )

        self.assertEqual(MeteredUsageRecord.objects.count(), 0)
        mock_inactive.assert_called_once_with(self.project.pk)

    @patch("core.metering.storage._redis")
    @patch("core.metering.storage.get_project_spiderdata_storage_bytes")
    def test_delete_hour_trapezoid(self, mock_get_size, mock_redis):
        mock_get_size.return_value = 0
        mock_conn = MagicMock()
        mock_conn.get.return_value = json.dumps(
            {"observed_at": "2026-06-12T10:00:00+00:00", "storage_bytes_end": 2_000_000}
        ).encode()
        mock_redis.return_value = mock_conn

        process_hourly_storage_metered_usage_for_project(
            self.project,
            hour_start=self.hour_start,
            hour_end=self.hour_end,
        )

        row = MeteredUsageRecord.objects.get()
        self.assertEqual(row.metrics[METRIC_STORAGE_BYTES_END], 0)
        self.assertEqual(row.metrics[METRIC_STORAGE_BYTES_START], 2_000_000)
        self.assertEqual(row.metrics[METRIC_STORAGE_BYTE_HOURS], 1_000_000)

    @patch("core.metering.storage.process_hourly_storage_metered_usage_for_project")
    @patch("core.metering.storage.spiderdata_db_client")
    def test_batch_meters_candidate_projects(self, mock_client, mock_process):
        mock_client.get_connection.return_value = True
        ref = datetime(2026, 6, 12, 11, 5, 0, tzinfo=dt_timezone.utc)

        record_hourly_storage_metered_usage_batch(reference=ref)

        mock_process.assert_called_once()
        project, = mock_process.call_args.args
        self.assertEqual(project.pk, self.project.pk)
        self.assertEqual(mock_process.call_args.kwargs["hour_start"], self.hour_start)

    @patch("core.metering.storage._redis")
    @patch("core.metering.storage.get_project_spiderdata_storage_bytes")
    def test_idempotent_second_insert_skipped(self, mock_get_size, mock_redis):
        mock_get_size.return_value = 500
        mock_conn = MagicMock()
        mock_conn.get.return_value = None
        mock_redis.return_value = mock_conn

        kwargs = dict(
            hour_start=self.hour_start,
            hour_end=self.hour_end,
            observed_at=self.observed_at,
        )
        process_hourly_storage_metered_usage_for_project(self.project, **kwargs)
        process_hourly_storage_metered_usage_for_project(self.project, **kwargs)
        self.assertEqual(MeteredUsageRecord.objects.count(), 1)

    @override_settings(METERED_USAGE_STORAGE_HOURLY_ENABLED=False)
    @patch("core.metering.storage.process_hourly_storage_metered_usage_for_project")
    def test_batch_disabled_is_noop(self, mock_process):
        record_hourly_storage_metered_usage_batch()
        mock_process.assert_not_called()

    @patch("core.metering.storage._save_last_sample")
    @patch("core.metering.storage._mark_project_storage_active")
    @patch("core.metering.storage.get_project_spiderdata_storage_bytes")
    def test_bootstrap_seeds_watermark_without_ledger(
        self, mock_get_size, mock_active, mock_save
    ):
        mock_get_size.return_value = 42_000

        count = bootstrap_storage_meter_watermarks()

        self.assertEqual(count, 1)
        mock_active.assert_called_once_with(self.project.pk)
        mock_save.assert_called_once()
        self.assertEqual(MeteredUsageRecord.objects.count(), 0)
