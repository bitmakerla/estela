# Generated by Django 3.1.1 on 2022-06-21 13:53

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0016_deploy"),
    ]

    operations = [
        migrations.AddField(
            model_name="spidercronjob",
            name="data_expiry_days",
            field=models.PositiveSmallIntegerField(null=True),
        ),
        migrations.AddField(
            model_name="spidercronjob",
            name="data_status",
            field=models.CharField(
                choices=[
                    ("PERSISTENT", "Persistent"),
                    ("DELETED", "Deleted"),
                    ("PENDING", "Pending"),
                ],
                default="PERSISTENT",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="spiderjob",
            name="data_expiry_days",
            field=models.PositiveSmallIntegerField(null=True),
        ),
        migrations.AddField(
            model_name="spiderjob",
            name="data_status",
            field=models.CharField(
                choices=[
                    ("PERSISTENT", "Persistent"),
                    ("DELETED", "Deleted"),
                    ("PENDING", "Pending"),
                ],
                default="PERSISTENT",
                max_length=20,
            ),
        ),
    ]
