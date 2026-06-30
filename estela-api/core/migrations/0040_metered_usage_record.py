import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0039_userprofile"),
    ]

    operations = [
        migrations.CreateModel(
            name="MeteredUsageRecord",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "recorded_at",
                    models.DateTimeField(
                        auto_now_add=True,
                        editable=False,
                        help_text="Server time when this row was inserted.",
                    ),
                ),
                (
                    "idempotency_key",
                    models.CharField(
                        blank=True,
                        help_text="Unique when set so Celery retries do not double-insert.",
                        max_length=512,
                        null=True,
                        unique=True,
                    ),
                ),
                (
                    "interval_start",
                    models.DateTimeField(
                        blank=True,
                        help_text=(
                            "Half-open interval ``[interval_start, interval_end)``. For ``DELTA_SLICE``, "
                            "the Redis sample window. For ``JOB_CLOSE``, ``ADJUSTMENT``, and ``DATA_DELETE``, "
                            "a minimal slice ``[t, t + 1 microsecond)`` anchoring event time ``t`` for bucketing."
                        ),
                        null=True,
                    ),
                ),
                (
                    "interval_end",
                    models.DateTimeField(
                        blank=True,
                        help_text="Exclusive end of the half-open interval (see ``interval_start``).",
                        null=True,
                    ),
                ),
                (
                    "kind",
                    models.CharField(
                        choices=[
                            ("JOB_CLOSE", "Job close"),
                            ("DATA_DELETE", "Data delete"),
                            ("ADJUSTMENT", "Adjustment"),
                            ("DELTA_SLICE", "Delta slice"),
                        ],
                        help_text="Fact classification.",
                        max_length=32,
                    ),
                ),
                (
                    "source_ref",
                    models.CharField(
                        blank=True,
                        default="",
                        help_text="Optional cross-system reference (e.g. spider run id).",
                        max_length=512,
                    ),
                ),
                (
                    "adjustment_reason",
                    models.CharField(
                        blank=True,
                        choices=[
                            (
                                "RECONCILE_SCRAPY_FINAL",
                                "Reconcile hourly slices vs final Scrapy totals",
                            ),
                            ("RECONCILE_STORAGE", "Reconcile storage totals"),
                            ("MANUAL", "Manual adjustment"),
                        ],
                        default="",
                        help_text="Set for ADJUSTMENT rows.",
                        max_length=64,
                    ),
                ),
                (
                    "resource_kind",
                    models.CharField(
                        help_text=(
                            "Generic resource type for control-plane attribution "
                            "(e.g. SpiderJob, BuildJob, RawSink)."
                        ),
                        max_length=64,
                    ),
                ),
                (
                    "resource_id",
                    models.CharField(
                        help_text="Opaque resource identifier within resource_kind.",
                        max_length=512,
                    ),
                ),
                (
                    "reporter",
                    models.CharField(
                        blank=True,
                        default="",
                        help_text="Service that emitted this row (e.g. estela, bitmaker-proxy).",
                        max_length=64,
                    ),
                ),
                (
                    "metrics",
                    models.JSONField(
                        blank=True,
                        default=dict,
                        help_text=(
                            "Open metric payload keyed by canonical names (network_bytes, storage_bytes, "
                            "build_duration_seconds, …). Primary source of truth for usage facts."
                        ),
                    ),
                ),
                (
                    "project",
                    models.ForeignKey(
                        help_text="Project this usage roll ups to.",
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="metered_usage_records",
                        to="core.project",
                    ),
                ),
            ],
            options={
                "ordering": ["-recorded_at"],
                "indexes": [
                    models.Index(
                        fields=["project", "interval_start"],
                        name="core_metere_project_ivs_idx",
                    ),
                    models.Index(
                        fields=["project", "recorded_at"],
                        name="core_metere_project_84eedd_idx",
                    ),
                    models.Index(
                        fields=[
                            "project",
                            "resource_kind",
                            "resource_id",
                            "interval_start",
                        ],
                        name="core_metere_res_ivs_idx",
                    ),
                ],
            },
        ),
    ]
