from django.db import migrations, models


class Migration(migrations.Migration):
    """A Project's owner-to-be, when an Operator set it up before they first signed in
    (ADR 0018, omx-8q5.4.27).

    Only this field: the MeteredUsageRecord index changes `makemigrations` also proposes belong to
    the models of feat/auth-mode (omx-6uu.9), as in 0047. Nullable, like every field this stack
    adds: staging's database is shared with estela images that do not know it.
    """

    dependencies = [
        ("core", "0049_userprofile_is_operator"),
    ]

    operations = [
        migrations.AddField(
            model_name="project",
            name="pending_owner_email",
            field=models.EmailField(
                blank=True,
                default=None,
                help_text="A User of the owner Org who owns the Project from their first sign-in; "
                "until then the Operator who created it does.",
                max_length=254,
                null=True,
            ),
        ),
    ]
