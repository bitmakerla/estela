"""Tests for :mod:`core.metering.hourly` first-tick baseline."""

import json
from datetime import datetime, timezone as dt_timezone
from unittest.mock import MagicMock, patch

from django.test import TestCase, override_settings

from core.models import MeteredUsageRecord, Project, Spider, SpiderJob
from core.metering.hourly import process_hourly_metered_usage_for_job


@override_settings(METERED_USAGE_HOURLY_ENABLED=True)
class HourlyFirstTickTests(TestCase):
    def setUp(self):
        self.project = Project.objects.create(name="hourly-test-project")
        self.spider = Spider.objects.create(project=self.project, name="s")
        self.job = SpiderJob.objects.create(
            spider=self.spider,
            status=SpiderJob.RUNNING_STATUS,
        )
        created = datetime(2026, 1, 15, 7, 5, 0, tzinfo=dt_timezone.utc)
        SpiderJob.objects.filter(pk=self.job.pk).update(
            created=created,
            proxy_usage_data={"proxy_name": "slice-proxy"},
        )
        self.job.refresh_from_db()

    def tearDown(self):
        import core.metering.hourly as hourly_mod

        hourly_mod._CLIENT = None

    @patch("core.metering.hourly._redis")
    @patch("core.metering.hourly.read_scrapy_counters_from_redis")
    def test_first_redis_read_diffs_from_zero_since_job_created(
        self, mock_read, mock_redis
    ):
        mock_read.return_value = {
            "elapsed_time_seconds": 3300.0,
            "total_response_bytes": 1000,
            "item_count": 10,
            "request_count": 50,
            "meter_proxy_redis_bytes": 0,
            "storage_obj_bytes_total": 0,
        }
        mock_conn = MagicMock()
        mock_conn.get.return_value = None
        mock_redis.return_value = mock_conn

        tick = datetime(2026, 1, 15, 8, 0, 0, tzinfo=dt_timezone.utc)
        with patch("core.metering.hourly.timezone.now", return_value=tick):
            process_hourly_metered_usage_for_job(self.job)

        row = MeteredUsageRecord.objects.get(
            job=self.job, kind=MeteredUsageRecord.Kind.DELTA_SLICE
        )
        self.assertEqual(row.delta_network_bytes, 1000)
        self.assertEqual(row.delta_item_count, 10)
        self.assertEqual(row.delta_request_count, 50)
        self.assertEqual(row.delta_storage_bytes, 0)
        self.assertEqual(row.proxy_name, "slice-proxy")
        self.assertEqual(
            row.interval_start,
            datetime(2026, 1, 15, 7, 5, 0, tzinfo=dt_timezone.utc),
        )
        self.assertEqual(
            row.interval_end,
            datetime(2026, 1, 15, 8, 0, 0, tzinfo=dt_timezone.utc),
        )
        mock_conn.set.assert_called()

    @patch("core.metering.hourly._redis")
    @patch("core.metering.hourly.read_scrapy_counters_from_redis")
    def test_second_tick_uses_redis_prev_not_job_created(
        self, mock_read, mock_redis
    ):
        prev_iso = "2026-01-15T08:00:00+00:00"
        prev_payload = {
            "observed_at": prev_iso,
            "elapsed_time_seconds": 3300.0,
            "total_response_bytes": 1000,
            "item_count": 10,
            "request_count": 50,
            "meter_proxy_redis_bytes": 0,
            "storage_obj_bytes_total": 100,
        }
        mock_conn = MagicMock()
        mock_conn.get.return_value = json.dumps(prev_payload).encode()
        mock_redis.return_value = mock_conn

        mock_read.return_value = {
            "elapsed_time_seconds": 6900.0,
            "total_response_bytes": 2500,
            "item_count": 25,
            "request_count": 100,
            "meter_proxy_redis_bytes": 0,
            "storage_obj_bytes_total": 400,
        }

        tick = datetime(2026, 1, 15, 9, 0, 0, tzinfo=dt_timezone.utc)
        with patch("core.metering.hourly.timezone.now", return_value=tick):
            process_hourly_metered_usage_for_job(self.job)

        row = MeteredUsageRecord.objects.get(
            job=self.job, kind=MeteredUsageRecord.Kind.DELTA_SLICE
        )
        self.assertEqual(row.delta_network_bytes, 1500)
        self.assertEqual(row.delta_storage_bytes, 300)
        self.assertEqual(row.proxy_name, "slice-proxy")
        self.assertEqual(
            row.interval_start,
            datetime(2026, 1, 15, 8, 0, 0, tzinfo=dt_timezone.utc),
        )
        self.assertEqual(
            row.interval_end,
            datetime(2026, 1, 15, 9, 0, 0, tzinfo=dt_timezone.utc),
        )
