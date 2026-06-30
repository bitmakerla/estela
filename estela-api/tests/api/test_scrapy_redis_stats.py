"""Tests for Scrapy stats parsing from Redis-style string hashes."""

from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase

from api.utils import (
    SCRAPY_STAT_PROXY_RESPONSE_BYTES,
    delete_hourly_meter_last_sample_from_redis,
    metered_proxy_name_from_job,
    parse_scrapy_stats_redis_hash,
)


class ParseScrapyStatsRedisHashTests(SimpleTestCase):
    def test_full_parse_minimal_keys(self):
        stats = {
            "elapsed_time_seconds": "120",
            "downloader/response_bytes": "9000",
            "item_scraped_count": "3",
            "downloader/request_count": "15",
        }
        out = parse_scrapy_stats_redis_hash(stats)
        self.assertEqual(out["elapsed_time_seconds"], 120.0)
        self.assertEqual(out["total_response_bytes"], 9000)
        self.assertEqual(out["item_count"], 3)
        self.assertEqual(out["request_count"], 15)
        self.assertEqual(out["storage_obj_bytes_total"], 0)
        self.assertEqual(out["meter_proxy_redis_bytes"], 0)

    def test_storage_fallback_keys(self):
        stats = {
            "elapsed_time_seconds": "1",
            "downloader/response_bytes": "0",
            "item_scraped_count": "0",
            "downloader/request_count": "0",
            "estela/items_data_size": "100",
            "requests_data_size": "200",
            "estela/logs_data_size": "50",
        }
        out = parse_scrapy_stats_redis_hash(stats)
        self.assertEqual(out["storage_obj_bytes_total"], 350)

    def test_obj_byte_size_stats_preferred_over_legacy_sizes(self):
        stats = {
            "elapsed_time_seconds": "1",
            "downloader/response_bytes": "0",
            "item_scraped_count": "0",
            "downloader/request_count": "0",
            "item_obj_byte_size": "10",
            "request_obj_byte_size": "20",
            "log_obj_byte_size": "5",
            "estela/items_data_size": "9999",
            "requests_data_size": "9999",
            "estela/logs_data_size": "9999",
        }
        out = parse_scrapy_stats_redis_hash(stats)
        self.assertEqual(out["storage_obj_bytes_total"], 35)

    def test_proxy_raw_bytes_uses_scrapy_stat_key(self):
        stats = {
            "elapsed_time_seconds": "0",
            "downloader/response_bytes": "0",
            "item_scraped_count": "0",
            "downloader/request_count": "0",
            SCRAPY_STAT_PROXY_RESPONSE_BYTES: "777",
        }
        out = parse_scrapy_stats_redis_hash(stats)
        self.assertEqual(out["meter_proxy_redis_bytes"], 777)


class MeteredProxyNameFromJobTests(SimpleTestCase):
    def test_trims_without_refresh_when_no_pk(self):
        job = SimpleNamespace(pk=None, proxy_usage_data={"proxy_name": "  a\n"})
        self.assertEqual(metered_proxy_name_from_job(job), "a")

    def test_parses_json_string_payload(self):
        job = SimpleNamespace(pk=None, proxy_usage_data='{"proxy_name": "p"}')
        self.assertEqual(metered_proxy_name_from_job(job), "p")

    def test_truncates_to_512(self):
        long_name = "x" * 600
        job = SimpleNamespace(pk=None, proxy_usage_data={"proxy_name": long_name})
        self.assertEqual(len(metered_proxy_name_from_job(job)), 512)


class DeleteHourlyMeterLastSampleFromRedisTests(SimpleTestCase):
    @patch("api.utils.redis.from_url")
    def test_suppresses_regular_redis_errors(self, mock_from_url):
        conn = MagicMock()
        conn.delete.side_effect = Exception("redis unavailable")
        mock_from_url.return_value = conn

        delete_hourly_meter_last_sample_from_redis(SimpleNamespace(key="job-key"))

        conn.delete.assert_called_once()

    @patch("api.utils.redis.from_url")
    def test_does_not_suppress_keyboard_interrupt(self, mock_from_url):
        conn = MagicMock()
        conn.delete.side_effect = KeyboardInterrupt
        mock_from_url.return_value = conn

        with self.assertRaises(KeyboardInterrupt):
            delete_hourly_meter_last_sample_from_redis(SimpleNamespace(key="job-key"))
