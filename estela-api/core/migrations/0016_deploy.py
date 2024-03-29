# Generated by Django 3.1.1 on 2022-02-04 17:01

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("core", "0015_spidercronjob_unique_collection"),
    ]

    operations = [
        migrations.CreateModel(
            name="Deploy",
            fields=[
                ("did", models.AutoField(primary_key=True, serialize=False)),
                ("created", models.DateTimeField(auto_now_add=True)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("SUCCESS", "Success"),
                            ("BUILDING", "Building"),
                            ("FAILURE", "Failure"),
                            ("CANCELED", "Canceled"),
                        ],
                        default="BUILDING",
                        max_length=12,
                    ),
                ),
                (
                    "project",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE, to="core.project"
                    ),
                ),
                ("spiders", models.ManyToManyField(to="core.Spider")),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created"],
            },
        ),
    ]
