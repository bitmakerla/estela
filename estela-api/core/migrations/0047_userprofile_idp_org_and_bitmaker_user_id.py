from django.db import migrations, models


class Migration(migrations.Migration):
    """A User's own Org and Bitmaker's id for them (ADR 0017, omx-8q5.4.14).

    Only these two fields: the MeteredUsageRecord index changes `makemigrations` also proposes
    belong to the models of feat/auth-mode, which carries no migration for them yet (omx-6uu.9).
    """

    dependencies = [
        ("core", "0046_project_billing_account_id"),
    ]

    operations = [
        migrations.AddField(
            model_name="userprofile",
            name="bitmaker_user_id",
            field=models.CharField(
                blank=True,
                default=None,
                help_text="Bitmaker's User id (usr_...), from the Account Registry.",
                max_length=30,
                null=True,
                unique=True,
            ),
        ),
        migrations.AddField(
            model_name="userprofile",
            name="idp_org_id",
            field=models.CharField(
                blank=True,
                default=None,
                help_text="The user's own Org at the identity provider.",
                max_length=255,
                null=True,
            ),
        ),
    ]
