# Generated by Django 3.1.14 on 2023-05-23 14:05

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("core", "0028_notification"),
    ]

    operations = [
        migrations.AlterModelOptions(
            name="notification",
            options={},
        ),
        migrations.RemoveField(
            model_name="notification",
            name="created_at",
        ),
        migrations.RemoveField(
            model_name="notification",
            name="seen",
        ),
        migrations.AlterField(
            model_name="notification",
            name="project",
            field=models.ForeignKey(
                help_text="Project belong the notification",
                on_delete=django.db.models.deletion.CASCADE,
                to="core.project",
            ),
        ),
        migrations.AlterField(
            model_name="notification",
            name="user",
            field=models.ForeignKey(
                help_text="User who created the notification.",
                on_delete=django.db.models.deletion.CASCADE,
                to=settings.AUTH_USER_MODEL,
            ),
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
                    "created_at",
                    models.DateTimeField(
                        auto_now_add=True, help_text="Subscription date."
                    ),
                ),
                (
                    "notification",
                    models.ForeignKey(
                        help_text="Notification to which the user is subscribed.",
                        on_delete=django.db.models.deletion.CASCADE,
                        to="core.notification",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        help_text="User whose this notification belongs to.",
                        on_delete=django.db.models.deletion.CASCADE,
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddField(
            model_name="notification",
            name="users",
            field=models.ManyToManyField(
                help_text="Users subscribed to this notification.",
                related_name="notifications",
                through="core.UserNotification",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
