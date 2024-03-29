# Generated by Django 3.1.14 on 2023-06-12 04:33

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("core", "0028_remove_job_statuses"),
    ]

    operations = [
        migrations.CreateModel(
            name="Notification",
            fields=[
                (
                    "nid",
                    models.AutoField(
                        help_text="A unique integer value identifying each notification",
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "message",
                    models.CharField(
                        help_text="Notification message.", max_length=1000
                    ),
                ),
                (
                    "project",
                    models.ForeignKey(
                        help_text="Project where the notification belongs",
                        on_delete=django.db.models.deletion.CASCADE,
                        to="core.project",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        help_text="User who performed the action on this notification.",
                        on_delete=django.db.models.deletion.CASCADE,
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name="UserNotification",
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
                    "seen",
                    models.BooleanField(
                        default=False, help_text="Whether the notification was seen."
                    ),
                ),
                (
                    "created",
                    models.DateTimeField(
                        auto_now_add=True,
                        help_text="Date when the notification was sent.",
                    ),
                ),
                (
                    "notification",
                    models.ForeignKey(
                        help_text="Notification that the user received.",
                        on_delete=django.db.models.deletion.CASCADE,
                        to="core.notification",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        help_text="Related user.",
                        on_delete=django.db.models.deletion.CASCADE,
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created"],
            },
        ),
        migrations.AddField(
            model_name="notification",
            name="users",
            field=models.ManyToManyField(
                help_text="Users that received this notification.",
                related_name="notifications",
                through="core.UserNotification",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
