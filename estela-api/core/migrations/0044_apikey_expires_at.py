from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0043_apikey"),
    ]

    operations = [
        migrations.AddField(
            model_name="apikey",
            name="expires_at",
            field=models.DateTimeField(
                blank=True,
                help_text="Expiry date. Null only for keys issued before expiry existed.",
                null=True,
            ),
        ),
    ]
