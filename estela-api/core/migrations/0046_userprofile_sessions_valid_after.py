from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0045_runtoken"),
    ]

    operations = [
        migrations.AddField(
            model_name="userprofile",
            name="sessions_valid_after",
            field=models.DateTimeField(
                blank=True,
                help_text="Sign-ins before this moment are no longer accepted.",
                null=True,
            ),
        ),
    ]
