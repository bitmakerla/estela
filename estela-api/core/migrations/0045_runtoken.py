import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("core", "0044_userprofile_oidc_sub"),
    ]

    operations = [
        migrations.CreateModel(
            name="RunToken",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("key_hash", models.CharField(help_text="SHA-256 of the token.", max_length=64, unique=True)),
                ("created", models.DateTimeField(auto_now_add=True)),
                ("deploy", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="run_tokens", to="core.deploy")),
                ("job", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="run_tokens", to="core.spiderjob")),
                ("user", models.ForeignKey(help_text="Who the run acts as.", on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
