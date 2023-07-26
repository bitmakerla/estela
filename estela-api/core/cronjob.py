import json

from core.tasks import launch_job
from django_celery_beat.models import CrontabSchedule, PeriodicTask


def create_cronjob(name, key, args, env_vars, tags, schedule, data_expiry_days=None):
    minute, hour, day_of_month, month, day_of_week = schedule.split(" ")
    cjid, sid, pid = key.split(".")
    data = {"cronjob": cjid, "args": args, "env_vars": env_vars, "tags": tags}
    schedule, _ = CrontabSchedule.objects.get_or_create(
        minute=minute,
        hour=hour,
        day_of_week=day_of_week,
        day_of_month=day_of_month,
        month_of_year=month,
    )
    response = PeriodicTask.objects.create(
        crontab=schedule,
        name=name,
        task="core.tasks.launch_job",
        args=json.dumps([sid, data, data_expiry_days]),
    )
    return response


def run_cronjob_once(data):
    _data = {
        "cronjob": data.get("cjid"),
        "args": data.get("cargs"),
        "env_vars": data.get("cenv_vars"),
        "tags": data.get("ctags"),
    }
    launch_job(data.get("spider", {}).get("sid"), _data)


def disable_cronjob(key):
    try:
        cronjob = PeriodicTask.objects.get(name=key, enabled=True)
        cronjob.enabled = False
        cronjob.save()
        return True
    except PeriodicTask.DoesNotExist:
        return None


def enable_cronjob(key):
    try:
        cronjob = PeriodicTask.objects.get(name=key, enabled=False)
        cronjob.enabled = True
        cronjob.save()
        return True
    except PeriodicTask.DoesNotExist:
        return None


def delete_cronjob(key):
    try:
        cronjob = PeriodicTask.objects.get(name=key)
        cronjob.delete()
        return True
    except PeriodicTask.DoesNotExist:
        return None


def update_schedule(key, schedule):
    try:
        cronjob = PeriodicTask.objects.get(name=key)
        minute, hour, day_of_month, month, day_of_week = schedule.split(" ")
        schedule, _ = CrontabSchedule.objects.get_or_create(
            minute=minute,
            hour=hour,
            day_of_week=day_of_week,
            day_of_month=day_of_month,
            month_of_year=month,
        )
        cronjob.crontab = schedule
        cronjob.save()
        return True
    except PeriodicTask.DoesNotExist:
        return None
