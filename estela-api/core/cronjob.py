import json

from django_celery_beat.models import CrontabSchedule, PeriodicTask

from core.tasks import launch_job


def create_cronjob(name, key, args, env_vars, tags, schedule, data_expiry_days=None):
    m, h, d_w, d_m, m_y = schedule.split(" ")
    cjid, sid, pid = key.split(".")
    data = {"cronjob": cjid, "args": args, "env_vars": env_vars, "tags": tags}
    schedule, _ = CrontabSchedule.objects.get_or_create(
        minute=m,
        hour=h,
        day_of_week=d_w,
        day_of_month=d_m,
        month_of_year=m_y,
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
    launch_job(data.get("spider"), _data)


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
        m, h, d_w, d_m, m_y = schedule.split(" ")
        schedule, _ = CrontabSchedule.objects.get_or_create(
            minute=m,
            hour=h,
            day_of_week=d_w,
            day_of_month=d_m,
            month_of_year=m_y,
        )
        cronjob.crontab = schedule
        cronjob.save()
        return True
    except PeriodicTask.DoesNotExist:
        return None
