"""The identity provider's subject claim, which is what makes one account work everywhere.

Nullable, and staying nullable: an account that has not signed in through the provider yet has
no subject, and inventing one would be a lie. Unique so two rows can never claim the same
identity, which is also what makes linking safe: the first sign-in of an existing account
attaches the subject to the row that already owns the projects instead of creating a second.
"""

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0043_apikey"),
    ]

    operations = [
        migrations.AddField(
            model_name="userprofile",
            name="oidc_sub",
            field=models.CharField(
                blank=True,
                default=None,
                help_text="Subject claim from the identity provider.",
                max_length=255,
                null=True,
                unique=True,
            ),
        ),
    ]
