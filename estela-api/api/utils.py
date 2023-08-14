from datetime import timedelta

import redis
from django.conf import settings

from core.models import SpiderJobEnvVar


def update_env_vars(instance, env_vars, level="project"):
    env_vars_instance = instance.env_vars.all()
    for env_var in env_vars:
        if env_vars_instance.filter(**env_var).exists():
            continue
        elif env_var["masked"] is True and env_var["value"] == "__MASKED__":
            continue
        elif env_var["masked"] is False and env_var["value"] == "__MASKED__":
            env_vars_instance.filter(name=env_var["name"]).update(masked=False)
        elif env_var["name"] in [value.name for value in env_vars_instance]:
            env_vars_instance.filter(name=env_var["name"]).update(
                value=env_var["value"],
                masked=env_var["masked"],
            )
        else:
            if level == "project":
                SpiderJobEnvVar.objects.create(project=instance, **env_var)
            elif level == "spider":
                SpiderJobEnvVar.objects.create(spider=instance, **env_var)

    for env_var in env_vars_instance:
        if env_var.name not in [value["name"] for value in env_vars]:
            env_var.delete()


def update_stats_from_redis(job):
    redis_conn = redis.from_url(settings.REDIS_URL)
    job_stats = redis_conn.hgetall(f"scrapy_stats_{job.key}")
    job.lifespan = timedelta(
        seconds=int(float(job_stats.get(b"elapsed_time_seconds", b"0").decode()))
    )
    job.total_response_bytes = int(
        job_stats.get(b"downloader/response_bytes", b"0").decode()
    )
    job.item_count = int(job_stats.get(b"item_scraped_count", b"0").decode())
    job.request_count = int(job_stats.get(b"downloader/request_count", b"0").decode())


def delete_stats_from_redis(job):
    redis_conn = redis.from_url(settings.REDIS_URL)
    try:
        redis_conn.delete(f"scrapy_stats_{job.key}")
    except:
        pass
