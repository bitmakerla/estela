# Drop legacy delta_* columns; usage facts live in metrics JSON only.

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0041_metered_usage_metrics_json"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="meteredusagerecord",
            name="delta_network_bytes",
        ),
        migrations.RemoveField(
            model_name="meteredusagerecord",
            name="delta_request_count",
        ),
        migrations.RemoveField(
            model_name="meteredusagerecord",
            name="delta_item_count",
        ),
        migrations.RemoveField(
            model_name="meteredusagerecord",
            name="delta_storage_bytes",
        ),
        migrations.RemoveField(
            model_name="meteredusagerecord",
            name="delta_proxy_bytes",
        ),
        migrations.RemoveField(
            model_name="meteredusagerecord",
            name="delta_runtime_seconds",
        ),
    ]
