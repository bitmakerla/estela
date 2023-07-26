from datetime import timedelta

import redis
from django.conf import settings


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
