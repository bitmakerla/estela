# Generated manually

from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0038_add_connection_airflow_models'),
    ]

    operations = [
        migrations.CreateModel(
            name='DataExport',
            fields=[
                ('eid', models.AutoField(help_text='A unique integer value identifying this export.', primary_key=True, serialize=False)),
                ('dag_run_id', models.CharField(blank=True, help_text='Airflow DAG run ID.', max_length=255)),
                ('dag_name', models.CharField(help_text='Airflow DAG name used for export.', max_length=255)),
                ('status', models.CharField(choices=[('PENDING', 'Pending'), ('IN_PROGRESS', 'In Progress'), ('COMPLETED', 'Completed'), ('FAILED', 'Failed')], default='PENDING', help_text='Export status.', max_length=20)),
                ('webhook_token', models.CharField(help_text='Unique webhook token for status updates.', max_length=255, unique=True)),
                ('export_path', models.CharField(blank=True, help_text='Path where data was exported in the target system.', max_length=1000)),
                ('error_message', models.TextField(blank=True, help_text='Error message if export failed.')),
                ('started_at', models.DateTimeField(blank=True, help_text='When the export started.', null=True)),
                ('completed_at', models.DateTimeField(blank=True, help_text='When the export completed.', null=True)),
                ('created', models.DateTimeField(auto_now_add=True, help_text='Export request creation date.')),
                ('updated', models.DateTimeField(auto_now=True, help_text='Export last update date.')),
                ('connection', models.ForeignKey(help_text='Connection to export data to.', on_delete=django.db.models.deletion.CASCADE, related_name='data_exports', to='core.connection')),
                ('spider_job', models.ForeignKey(help_text='SpiderJob whose data is being exported.', on_delete=django.db.models.deletion.CASCADE, related_name='data_exports', to='core.spiderjob')),
            ],
            options={
                'ordering': ['-created'],
            },
        ),
    ]