# Single migration: MeteredUsageRecord append-only ledger (final schema).

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
                            "Half-open [interval_start, interval_end): Redis sample window for "
                            "DELTA_SLICE; minimal slice [t, t+1us) for JOB_CLOSE / ADJUSTMENT / DATA_DELETE."
                        ),
                        null=True,
                    ),
                ),
                (
                    "interval_end",
                    models.DateTimeField(
                        blank=True,
                        help_text="Exclusive end of the half-open interval.",
                        null=True,
                    ),
                ),
                (
                    "delta_network_bytes",
                    models.BigIntegerField(
                        default=0,
                        help_text="Signed network bytes delta for this fact.",
                    ),
                ),
                (
                    "delta_request_count",
                    models.BigIntegerField(
                        default=0,
                        help_text="Signed HTTP request count delta.",
                    ),
                ),
                (
                    "delta_item_count",
                    models.BigIntegerField(
                        default=0,
                        help_text="Signed scraped item count delta.",
                    ),
                ),
                (
                    "delta_storage_bytes",
                    models.BigIntegerField(
                        default=0,
                        help_text=(
                            "Signed delta of combined spider-data object byte sizes (items + requests + "
                            "logs) from Redis cumulative stats. On DELTA_SLICE: diff between samples; on "
                            "JOB_CLOSE: full cumulative total when hourly metering is off; on "
                            "close-time ADJUSTMENT: residual vs sum of DELTA_SLICE rows."
                        ),
                    ),
                ),
                (
                    "delta_proxy_bytes",
                    models.BigIntegerField(
                        blank=True,
                        help_text=(
                            "Signed proxy response bytes delta. NULL means proxy attribution does not "
                            "apply to this row (vs. 0 which would mean 'applies but no change')."
                        ),
                        null=True,
                    ),
                ),
                (
                    "proxy_name",
                    models.CharField(
                        blank=True,
                        default="",
                        help_text="Proxy identifier from job.proxy_usage_data when applicable.",
                        max_length=512,
                    ),
                ),
                (
                    "delta_runtime_seconds",
                    models.DecimalField(
                        blank=True,
                        decimal_places=6,
                        help_text=(
                            "Signed seconds of spider-active runtime contributed by this row. NULL "
                            "means runtime attribution does not apply (e.g. DATA_DELETE)."
                        ),
                        max_digits=20,
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
                    "project",
                    models.ForeignKey(
                        help_text="Project this usage roll ups to.",
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="metered_usage_records",
                        to="core.project",
                    ),
                ),
                (
                    "job",
                    models.ForeignKey(
                        blank=True,
                        help_text="Spider job when attribution applies.",
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="metered_usage_records",
                        to="core.spiderjob",
                    ),
                ),
                (
                    "spider",
                    models.ForeignKey(
                        blank=True,
                        help_text=(
                            "Spider when attribution applies (typically job.spider when job is set)."
                        ),
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="metered_usage_records",
                        to="core.spider",
                    ),
                ),
                (
                    "cronjob",
                    models.ForeignKey(
                        blank=True,
                        help_text=(
                            "Cronjob when attribution applies; mirrored from job.cronjob on flow rows "
                            "when job is set."
                        ),
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="metered_usage_records",
                        to="core.spidercronjob",
                    ),
                ),
            ],
            options={
                "ordering": ["-recorded_at"],
            },
        ),
        migrations.AddIndex(
            model_name="meteredusagerecord",
            index=models.Index(
                fields=["project", "interval_start"],
                name="core_metere_project_ivs_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="meteredusagerecord",
            index=models.Index(
                fields=["project", "recorded_at"],
                name="core_metere_project_84eedd_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="meteredusagerecord",
            index=models.Index(
                fields=["spider", "interval_start"],
                name="core_metere_spider_ivs_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="meteredusagerecord",
            index=models.Index(
                fields=["job", "interval_start"],
                name="core_metere_job_ivs_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="meteredusagerecord",
            index=models.Index(
                fields=["cronjob", "interval_start"],
                name="core_metere_cronjob_ivs_idx",
            ),
        ),
    ]
