from ***REMOVED***_celery_beat.models import CrontabSchedule, PeriodicTask
import json

from celery import current_app


def create_cronjob(key, args, schedule="0 0 * * *", auth_token=None):  # At midnight
    cjid, sid, pid = key.split(".")
    m, h, d_w, d_m, m_y = schedule.split(" ")
    data = {"cronjob": cjid, "args": args}
    schedule, _ = CrontabSchedule.objects.get_or_create(
        minute=m,
        hour=h,
        day_of_week=d_w,
        day_of_month=d_m,
        month_of_year=m_y,
    )

    tasks = current_app.tasks.keys()
    response = PeriodicTask.objects.create(
        crontab=schedule,
        name=key,
        task="core.tasks.launch_job",
        args=json.dumps([sid, data, auth_token]),
    )
    return response


def delete_cronjob(key):
    try:
        cronjob = PeriodicTask.objects.get(name=key)
        cronjob.enabled = False
        cronjob.save()
        return True
    except PeriodicTask.DoesNotExist:
        return None
