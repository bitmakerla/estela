from django.db import migrations, models


class Migration(migrations.Migration):
    """Whether a User held estela.operator at their last sign-in (ADR 0018, omx-8q5.4.17).

    Only this field: the MeteredUsageRecord index changes `makemigrations` also proposes belong to
    the models of feat/auth-mode (omx-6uu.9), as in 0047. Nullable: an estela image without this
    field must still be able to create users in a database that has it (see the model).
    """

    dependencies = [
        ("core", "0048_project_owner_org_id"),
    ]

    operations = [
        migrations.AddField(
            model_name="userprofile",
            name="is_operator",
            field=models.BooleanField(
                null=True,
                default=False,
                help_text="Held estela.operator in Bitmaker's Org at their last sign-in.",
            ),
        ),
    ]
