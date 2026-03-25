from core.tiers import TIER_CHOICES

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0037_spiderjob_exclude_from_insertion_updates"),
    ]

    operations = [
        migrations.AddField(
            model_name="spiderjob",
            name="resource_tier",
            field=models.CharField(
                choices=TIER_CHOICES,
                default="LARGE",
                help_text="Resource tier for K8s pod allocation.",
                max_length=50,
            ),
        ),
        migrations.AddField(
            model_name="spidercronjob",
            name="resource_tier",
            field=models.CharField(
                choices=TIER_CHOICES,
                default="LARGE",
                help_text="Resource tier for jobs created by this cron job.",
                max_length=50,
            ),
        ),
    ]
