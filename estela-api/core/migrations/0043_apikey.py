import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("core", "0042_merge_metered_usage_and_project_dates"),
    ]

    operations = [
        migrations.CreateModel(
            name="ApiKey",
            fields=[
                (
                    "id",
                    models.AutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "name",
                    models.CharField(
                        help_text="What this key is used for.", max_length=100
                    ),
                ),
                (
                    "prefix",
                    models.CharField(
                        help_text="Leading fragment, shown so keys can be told apart.",
                        max_length=32,
                    ),
                ),
                (
                    "key_hash",
                    models.CharField(
                        help_text="SHA-256 of the key.", max_length=64, unique=True
                    ),
                ),
                (
                    "scopes",
                    models.JSONField(
                        default=list,
                        help_text="Extra permissions. Empty means read-only.",
                    ),
                ),
                (
                    "created",
                    models.DateTimeField(auto_now_add=True, help_text="Creation date."),
                ),
                (
                    "last_used_at",
                    models.DateTimeField(
                        blank=True,
                        help_text="Last time this key authenticated a request.",
                        null=True,
                    ),
                ),
                (
                    "revoked_at",
                    models.DateTimeField(
                        blank=True,
                        help_text="Revocation date. Null while usable.",
                        null=True,
                    ),
                ),
                (
                    "expires_at",
                    models.DateTimeField(
                        blank=True,
                        help_text="Expiry date. Null only for keys issued before expiry existed.",
                        null=True,
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        help_text="Owner.",
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="api_keys",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created"],
            },
        ),
    ]
