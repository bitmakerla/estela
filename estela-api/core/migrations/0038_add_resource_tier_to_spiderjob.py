from django.db import migrations, models
import django.db.models.deletion


def seed_predefined_tiers(apps, schema_editor):
    ResourceTier = apps.get_model("core", "ResourceTier")
    tiers = [
        {"name": "TINY",   "cpu_request": "128m",  "cpu_limit": "256m",  "mem_request": "96Mi",   "mem_limit": "128Mi"},
        {"name": "XSMALL", "cpu_request": "192m",  "cpu_limit": "384m",  "mem_request": "192Mi",  "mem_limit": "256Mi"},
        {"name": "SMALL",  "cpu_request": "256m",  "cpu_limit": "512m",  "mem_request": "384Mi",  "mem_limit": "512Mi"},
        {"name": "MEDIUM", "cpu_request": "256m",  "cpu_limit": "512m",  "mem_request": "768Mi",  "mem_limit": "1Gi"},
        {"name": "LARGE",  "cpu_request": "512m",  "cpu_limit": "1024m", "mem_request": "1152Mi", "mem_limit": "1536Mi"},
        {"name": "XLARGE", "cpu_request": "512m",  "cpu_limit": "1024m", "mem_request": "1536Mi", "mem_limit": "2Gi"},
        {"name": "HUGE",   "cpu_request": "1024m", "cpu_limit": "2048m", "mem_request": "3072Mi", "mem_limit": "4Gi"},
        {"name": "XHUGE",  "cpu_request": "2048m", "cpu_limit": "4096m", "mem_request": "6144Mi", "mem_limit": "8Gi"},
    ]
    for tier in tiers:
        ResourceTier.objects.create(project=None, **tier)


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0037_spiderjob_exclude_from_insertion_updates"),
    ]

    operations = [
        # 1. Create ResourceTier model
        migrations.CreateModel(
            name="ResourceTier",
            fields=[
                ("id", models.AutoField(primary_key=True, serialize=False)),
                ("name", models.CharField(help_text="Tier name.", max_length=50)),
                ("cpu_request", models.CharField(help_text="CPU request (e.g. 256m).", max_length=20)),
                ("cpu_limit", models.CharField(help_text="CPU limit (e.g. 512m).", max_length=20)),
                ("mem_request", models.CharField(help_text="Memory request (e.g. 384Mi).", max_length=20)),
                ("mem_limit", models.CharField(help_text="Memory limit (e.g. 512Mi).", max_length=20)),
                (
                    "project",
                    models.ForeignKey(
                        blank=True,
                        help_text="Project this tier belongs to. Null for predefined tiers.",
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="resource_tiers",
                        to="core.project",
                    ),
                ),
            ],
            options={
                "unique_together": {("project", "name")},
            },
        ),
        # 2. Seed predefined tiers
        migrations.RunPython(seed_predefined_tiers, migrations.RunPython.noop),
        # 3. Add resource_tier to SpiderJob
        migrations.AddField(
            model_name="spiderjob",
            name="resource_tier",
            field=models.CharField(
                default="LARGE",
                help_text="Resource tier for K8s pod allocation.",
                max_length=50,
            ),
        ),
        # 4. Add resource_tier to SpiderCronJob
        migrations.AddField(
            model_name="spidercronjob",
            name="resource_tier",
            field=models.CharField(
                default="LARGE",
                help_text="Resource tier for jobs created by this cron job.",
                max_length=50,
            ),
        ),
        # 5. Add default_resource_tier to Project
        migrations.AddField(
            model_name="project",
            name="default_resource_tier",
            field=models.CharField(
                default="LARGE",
                help_text="Default resource tier for jobs in this project.",
                max_length=50,
            ),
        ),
    ]
