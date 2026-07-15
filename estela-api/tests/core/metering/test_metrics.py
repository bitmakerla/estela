from decimal import Decimal

from django.test import TestCase

from core.metering.metrics import (
    METRIC_NETWORK_BYTES,
    REPORTER_ESTELA,
    RESOURCE_KIND_SPIDER_JOB,
    build_flow_metrics,
    metric_decimal,
    metric_int,
    prepare_metered_usage_fields,
    sum_estela_flow_metrics,
)
from core.models import MeteredUsageRecord, Project


class MetricsAdapterTests(TestCase):
    def setUp(self):
        self.project = Project.objects.create(name="metrics-test")

    def test_prepare_fields_requires_resource_attribution(self):
        with self.assertRaises(ValueError):
            prepare_metered_usage_fields(
                project=self.project,
                kind=MeteredUsageRecord.Kind.DELTA_SLICE,
                metrics=build_flow_metrics(network_bytes=1),
            )

    def test_prepare_fields_sets_reporter_default(self):
        fields = prepare_metered_usage_fields(
            project=self.project,
            resource_kind=RESOURCE_KIND_SPIDER_JOB,
            resource_id="42",
            kind=MeteredUsageRecord.Kind.DELTA_SLICE,
            metrics=build_flow_metrics(
                network_bytes=100,
                request_count=5,
                runtime_seconds=Decimal("12.5"),
            ),
        )
        self.assertEqual(fields["metrics"]["network_bytes"], 100)
        self.assertEqual(fields["reporter"], REPORTER_ESTELA)

    def test_open_metrics_preserved(self):
        fields = prepare_metered_usage_fields(
            project=self.project,
            resource_kind="BuildJob",
            resource_id="build-99",
            kind=MeteredUsageRecord.Kind.DELTA_SLICE,
            metrics={
                "build_duration_seconds": 45,
                "registry_push_bytes": 128000,
                "network_bytes": 0,
                "request_count": 0,
                "item_count": 0,
                "storage_bytes": 0,
            },
            reporter="build-worker",
        )
        self.assertEqual(fields["metrics"]["build_duration_seconds"], 45)
        self.assertEqual(fields["reporter"], "build-worker")

    def test_build_flow_metrics_omits_zero_runtime(self):
        metrics = build_flow_metrics(network_bytes=1, runtime_seconds=0)
        self.assertNotIn("runtime_seconds", metrics)

    def test_sum_estela_flow_metrics(self):
        totals = sum_estela_flow_metrics(
            [
                build_flow_metrics(network_bytes=100, request_count=1),
                build_flow_metrics(network_bytes=50, storage_bytes=-10),
            ]
        )
        self.assertEqual(totals["network"], 150)
        self.assertEqual(totals["storage_bytes"], -10)

    def test_metric_readers(self):
        metrics = {"network_bytes": 7, "runtime_seconds": "3.5"}
        self.assertEqual(metric_int(metrics, METRIC_NETWORK_BYTES), 7)
        self.assertEqual(metric_decimal(metrics, "runtime_seconds"), Decimal("3.5"))
