# Resource-only attribution: drop scrape FKs, proxy_name column; add reporter.

from django.db import migrations, models


def _reporter_column_exists(schema_editor):
    with schema_editor.connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT COUNT(*) FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'core_meteredusagerecord'
              AND COLUMN_NAME = 'reporter'
            """
        )
        return bool(cursor.fetchone()[0])


def ensure_reporter_column(apps, schema_editor):
    if _reporter_column_exists(schema_editor):
        return
    schema_editor.execute(
        "ALTER TABLE core_meteredusagerecord "
        "ADD COLUMN reporter varchar(64) NOT NULL DEFAULT ''"
    )


def backfill_resource_and_reporter(apps, schema_editor):
    MeteredUsageRecord = apps.get_model("core", "MeteredUsageRecord")
    for row in MeteredUsageRecord.objects.all().iterator():
        changed = False
        if not row.reporter:
            row.reporter = "estela"
            changed = True
        if not row.resource_kind and getattr(row, "job_id", None):
            row.resource_kind = "SpiderJob"
            row.resource_id = str(row.job_id)
            changed = True
        elif not row.resource_kind and getattr(row, "spider_id", None):
            row.resource_kind = "Spider"
            row.resource_id = str(row.spider_id)
            changed = True
        elif not row.resource_kind and row.project_id:
            row.resource_kind = "Project"
            row.resource_id = str(row.project_id)
            changed = True
        if changed:
            row.save(
                update_fields=["reporter", "resource_kind", "resource_id"]
            )


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0042_remove_metered_usage_delta_columns"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name="meteredusagerecord",
                    name="reporter",
                    field=models.CharField(
                        blank=True,
                        default="",
                        help_text=(
                            "Service that emitted this row "
                            "(e.g. estela, bitmaker-proxy)."
                        ),
                        max_length=64,
                    ),
                ),
            ],
            database_operations=[
                migrations.RunPython(
                    ensure_reporter_column, migrations.RunPython.noop
                ),
            ],
        ),
        migrations.RunPython(backfill_resource_and_reporter, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="meteredusagerecord",
            name="job",
        ),
        migrations.RemoveField(
            model_name="meteredusagerecord",
            name="spider",
        ),
        migrations.RemoveField(
            model_name="meteredusagerecord",
            name="cronjob",
        ),
        migrations.RemoveField(
            model_name="meteredusagerecord",
            name="proxy_name",
        ),
        migrations.AlterField(
            model_name="meteredusagerecord",
            name="resource_kind",
            field=models.CharField(
                help_text=(
                    "Generic resource type for control-plane attribution "
                    "(e.g. SpiderJob, BuildJob, RawSink)."
                ),
                max_length=64,
            ),
        ),
        migrations.AlterField(
            model_name="meteredusagerecord",
            name="resource_id",
            field=models.CharField(
                help_text="Opaque resource identifier within resource_kind.",
                max_length=512,
            ),
        ),
        migrations.AddIndex(
            model_name="meteredusagerecord",
            index=models.Index(
                fields=["project", "resource_kind", "resource_id", "interval_start"],
                name="core_metere_res_ivs_idx",
            ),
        ),
    ]
