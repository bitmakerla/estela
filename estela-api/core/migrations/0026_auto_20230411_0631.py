# Generated by Django 3.1.14 on 2023-04-11 06:31

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0025_delete_userprofile"),
    ]

    operations = [
        migrations.AddField(
            model_name="project",
            name="data_expiry_days",
            field=models.PositiveSmallIntegerField(
                default=1, help_text="Days before data is deleted."
            ),
        ),
        migrations.AddField(
            model_name="project",
            name="data_status",
            field=models.CharField(
                choices=[("PERSISTENT", "Persistent"), ("PENDING", "Pending")],
                default="PERSISTENT",
                help_text="Data status.",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="spider",
            name="data_expiry_days",
            field=models.PositiveSmallIntegerField(
                default=1, help_text="Days before data is deleted."
            ),
        ),
        migrations.AddField(
            model_name="spider",
            name="data_status",
            field=models.CharField(
                choices=[("PERSISTENT", "Persistent"), ("PENDING", "Pending")],
                default="PERSISTENT",
                help_text="Data status.",
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name="spidercronjob",
            name="data_expiry_days",
            field=models.PositiveSmallIntegerField(
                help_text="Days before data is deleted.", null=True
            ),
        ),
        migrations.AlterField(
            model_name="spidercronjob",
            name="data_status",
            field=models.CharField(
                choices=[("PERSISTENT", "Persistent"), ("PENDING", "Pending")],
                default="PERSISTENT",
                help_text="Data status.",
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name="spiderjob",
            name="data_expiry_days",
            field=models.PositiveSmallIntegerField(
                help_text="Days before data is deleted.", null=True
            ),
        ),
        migrations.AlterField(
            model_name="spiderjob",
            name="data_status",
            field=models.CharField(
                choices=[
                    ("PERSISTENT", "Persistent"),
                    ("PENDING", "Pending"),
                    ("DELETED", "Deleted"),
                ],
                default="PERSISTENT",
                help_text="Data status.",
                max_length=20,
            ),
        ),
    ]
