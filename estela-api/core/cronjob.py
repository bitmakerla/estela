import json

from django_celery_beat.models import CrontabSchedule, PeriodicTask

from core.tasks import launch_job


def create_cronjob(name, key, args, env_vars, tags, schedule, data_expiry_days=None, resource_tier=None):
    minute, hour, day_of_month, month, day_of_week = schedule.split(" ")
    cjid, sid, pid = key.split(".")
    data = {"cronjob": cjid, "args": args, "env_vars": env_vars, "tags": tags}
    if resource_tier:
        data["resource_tier"] = resource_tier
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
    env_vars = data.get("cenv_vars") or []
    env_vars = [ev for ev in env_vars if ev.get("value") is not None]
    _data = {
        "cronjob": data.get("cjid"),
        "args": data.get("cargs"),
        "env_vars": env_vars,
        "tags": data.get("ctags"),
    }
    if data.get("data_expiry_days") is not None:
        _data["data_expiry_days"] = data.get("data_expiry_days")
    resource_tier = data.get("resourceTier") or data.get("resource_tier")
    if resource_tier:
        _data["resource_tier"] = resource_tier
    launch_job.delay(data.get("spider", {}).get("sid"), _data, data.get("data_expiry_days"))


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
