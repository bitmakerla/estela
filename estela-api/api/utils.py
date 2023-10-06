from datetime import timedelta

import redis
from django.conf import settings

from api import errors
from api.exceptions import DataBaseError
from config.job_manager import spiderdata_db_client
from core.models import SpiderJobEnvVar, ProxyProvider


def update_env_vars(instance, env_vars, level="project", delete=True):
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

    if delete:
        for env_var in env_vars_instance:
            if env_var.name not in [value["name"] for value in env_vars]:
                env_var.delete()


def update_stats_from_redis(job, save_to_database=False):
    redis_conn = redis.from_url(settings.REDIS_URL)
    job_stats = redis_conn.hgetall(f"scrapy_stats_{job.key}")
    job_stats = {key.decode(): value.decode() for key, value in job_stats.items()}

    job.lifespan = timedelta(
        seconds=int(float(job_stats.get("elapsed_time_seconds", "0")))
    )
    job.total_response_bytes = int(job_stats.get("downloader/response_bytes", "0"))
    job.item_count = int(job_stats.get("item_scraped_count", "0"))
    job.request_count = int(job_stats.get("downloader/request_count", "0"))

    if save_to_database and job_stats:
        if not spiderdata_db_client.get_connection():
            raise DataBaseError({"error": errors.UNABLE_CONNECT_DB})

        for key, value in job_stats.items():
            if value.isdigit():
                job_stats[key] = int(value)
            else:
                try:
                    job_stats[key] = float(value)
                except ValueError:
                    pass

        job_collection_name = "{}-{}-job_stats".format(job.spider.sid, job.jid)
        job_stats["_id"] = job_collection_name
        spiderdata_db_client.insert_one_to_collection(
            str(job.spider.project.pid), "job_stats", job_stats
        )


def delete_stats_from_redis(job):
    redis_conn = redis.from_url(settings.REDIS_URL)
    try:
        redis_conn.delete(f"scrapy_stats_{job.key}")
    except:
        pass


def get_proxy_provider_envs(proxy_id):
    proxy_provider = ProxyProvider.objects.get(pk=proxy_id)
    proxy_attrs = [
        "username",
        "password",
        "host",
        "port",
        "name",
    ]
    fields_and_values = vars(proxy_provider)
    replaces = {
        "password": "pass",
        "host": "url",
        "username": "user",
    }
    env_vars = []
    for field, value in fields_and_values.items():
        if field in proxy_attrs:
            name = replaces.get(field, field).upper()
            if name != "NAME":
                masked = True
            else:
                masked = False
            env_vars.append(
                {"name": f"ESTELA_PROXY_{name}", "value": value, "masked": masked}
            )
    env_vars.append(
        {
            "name": "CUSTOM_PROXIES_ENABLED",
            "value": "True",
            "masked": False,
        }
    )
    return env_vars
