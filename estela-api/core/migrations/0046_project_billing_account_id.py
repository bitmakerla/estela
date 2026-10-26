from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0045_runtoken"),
    ]

    operations = [
        migrations.AddField(
            model_name="project",
            name="billing_account_id",
            field=models.CharField(
                blank=True,
                help_text="The paying Org's billing account (acct_...). Usage is emitted to billing only when set.",
                max_length=64,
                null=True,
            ),
        ),
    ]
