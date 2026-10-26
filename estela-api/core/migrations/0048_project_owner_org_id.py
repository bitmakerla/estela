from django.db import migrations, models


class Migration(migrations.Migration):
    """The Org that owns a Project, set at creation (ADR 0005 and 0018, omx-8q5.4.15).

    Only this field: the MeteredUsageRecord index changes `makemigrations` also proposes belong to
    the models of feat/auth-mode (omx-6uu.9), as in 0047.
    """

    dependencies = [
        ("core", "0047_userprofile_idp_org_and_bitmaker_user_id"),
    ]

    operations = [
        migrations.AddField(
            model_name="project",
            name="owner_org_id",
            field=models.CharField(
                blank=True,
                default=None,
                help_text="The Org that owns the Project, at the identity provider. Set at creation, never moved.",
                max_length=255,
                null=True,
            ),
        ),
    ]
