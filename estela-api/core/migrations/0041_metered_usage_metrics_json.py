# Add flexible metrics JSON + generic resource attribution to MeteredUsageRecord.

from decimal import Decimal

from django.db import migrations, models


def _legacy_to_metric(canonical, value):
    if value is None:
        return None
    if canonical == "runtime_seconds":
        return str(Decimal(str(value)))
    return int(value)


def backfill_metrics_and_resource(apps, schema_editor):
    MeteredUsageRecord = apps.get_model("core", "MeteredUsageRecord")
    mapping = {
        "network_bytes": "delta_network_bytes",
        "request_count": "delta_request_count",
        "item_count": "delta_item_count",
        "storage_bytes": "delta_storage_bytes",
        "runtime_seconds": "delta_runtime_seconds",
        "proxy_bytes": "delta_proxy_bytes",
    }
    for row in MeteredUsageRecord.objects.all().iterator():
        metrics = dict(row.metrics or {})
        changed = False
        for canonical, legacy in mapping.items():
            if canonical in metrics:
                continue
            val = getattr(row, legacy)
            if val is None:
                continue
            metrics[canonical] = _legacy_to_metric(canonical, val)
            changed = True
        if not row.resource_kind and row.job_id:
            row.resource_kind = "SpiderJob"
            row.resource_id = str(row.job_id)
            changed = True
        elif not row.resource_kind and row.spider_id:
            row.resource_kind = "Spider"
            row.resource_id = str(row.spider_id)
            changed = True
        elif not row.resource_kind and row.project_id:
            row.resource_kind = "Project"
            row.resource_id = str(row.project_id)
            changed = True
        if changed or metrics != (row.metrics or {}):
            row.metrics = metrics
            row.save(update_fields=["metrics", "resource_kind", "resource_id"])


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0040_metered_usage_record"),
    ]

    operations = [
        migrations.AddField(
            model_name="meteredusagerecord",
            name="resource_kind",
            field=models.CharField(
                blank=True,
                default="",
                help_text=(
                    "Generic resource type for control-plane attribution "
                    "(e.g. SpiderJob, BuildJob, RawSink)."
                ),
                max_length=64,
            ),
        ),
        migrations.AddField(
            model_name="meteredusagerecord",
            name="resource_id",
            field=models.CharField(
                blank=True,
                default="",
                help_text="Opaque resource identifier within resource_kind.",
                max_length=512,
            ),
        ),
        migrations.AddField(
            model_name="meteredusagerecord",
            name="metrics",
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text=(
                    "Open metric payload keyed by canonical names (network_bytes, "
                    "storage_bytes, build_duration_seconds, …). Legacy delta_* columns "
                    "mirror known keys for billing."
                ),
            ),
        ),
        migrations.RunPython(backfill_metrics_and_resource, migrations.RunPython.noop),
    ]
