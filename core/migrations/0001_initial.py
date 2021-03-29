# Generated by Django 3.1.1 on 2021-03-27 00:13

from ***REMOVED***.conf import settings
from ***REMOVED***.db import migrations, models
import ***REMOVED***.db.models.deletion
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Project',
            fields=[
                ('pid', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=1000)),
                ('users', models.ManyToManyField(to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='Spider',
            fields=[
                ('sid', models.AutoField(primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=1000)),
                ('project', models.ForeignKey(on_delete=***REMOVED***.db.models.deletion.CASCADE, related_name='spiders', to='core.project')),
            ],
        ),
        migrations.CreateModel(
            name='SpiderJob',
            fields=[
                ('jid', models.AutoField(primary_key=True, serialize=False)),
                ('status', models.CharField(choices=[('WAITING', 'Waiting'), ('RUNNING', 'Running'), ('COMPLETED', 'Completed')], default='WAITING', max_length=16)),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('spider', models.ForeignKey(on_delete=***REMOVED***.db.models.deletion.CASCADE, related_name='jobs', to='core.spider')),
            ],
            options={
                'ordering': ['created'],
            },
        ),
    ]
