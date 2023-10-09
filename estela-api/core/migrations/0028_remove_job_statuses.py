# Generated by Django 3.1.14 on 2023-05-29 07:44

from django.conf import settings
from django.db import migrations, models

from core.tasks import get_chain_to_process_usage_data, record_job_coverage_event


def update_spiderjobs_status(apps, schema_editor):
    SpiderJob = apps.get_model("core", "SpiderJob")
    incomplete_jobs = SpiderJob.objects.filter(status="INCOMPLETE")
    incomplete_jobs.update(status="COMPLETED")


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0027_spiderjobenvvar_masked"),
    ]

    operations = [
        migrations.RunPython(update_spiderjobs_status),
        migrations.AlterField(
            model_name="spiderjob",
            name="status",
            field=models.CharField(
                choices=[
                    ("IN_QUEUE", "In queue"),
                    ("WAITING", "Waiting"),
                    ("RUNNING", "Running"),
                    ("STOPPED", "Stopped"),
                    ("COMPLETED", "Completed"),
                    ("ERROR", "Error"),
                ],
                default="WAITING",
                help_text="Job status.",
                max_length=16,
            ),
        ),
    ]
