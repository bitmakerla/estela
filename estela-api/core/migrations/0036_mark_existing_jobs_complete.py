from django.db import migrations


def set_old_jobs_to_completed(apps, schema_editor):
    """Set all existing completed jobs to 100% database insertion progress."""
    SpiderJob = apps.get_model('core', 'SpiderJob')
    # Update all completed jobs to have 100% database insertion progress
    SpiderJob.objects.filter(
        status='COMPLETED',
    ).update(database_insertion_progress=100)


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0035_auto_20250729_2242'),  # Update this to match your previous migration
    ]

    operations = [
        migrations.RunPython(set_old_jobs_to_completed, reverse_code=migrations.RunPython.noop),
    ]
