# Generated by Django 3.1.14 on 2025-07-29 22:42

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0034_proxy_provider'),
    ]

    operations = [
        migrations.AddField(
            model_name='spiderjob',
            name='database_insertion_progress',
            field=models.FloatField(default=0, help_text='Percentage of items inserted into the database.'),
        ),
        migrations.AlterField(
            model_name='spiderjobenvvar',
            name='value',
            field=models.CharField(help_text='Env variable value.', max_length=12000),
        ),
    ]
