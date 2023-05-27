from collections import defaultdict
from datetime import datetime, time
from typing import List, Tuple
from re import findall
from django.db.models.query import QuerySet
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import status, mixins
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework.serializers import ListSerializer
from rest_framework.decorators import action
from api import errors
from api.exceptions import DataBaseError
from api.mixins import BaseViewSet
from api.serializers.stats import (
    StatsSerializer,
    GlobalStatsSerializer,
    SpidersJobsStatsSerializer,
    JobsMetadataSerializer,
    JobsStatsSerializer,
)
from config.job_manager import spiderdata_db_client
from core.models import (
    Project,
    Spider,
    SpiderJob,
)


class StatsForDashboardMixin:
    def get_parameters(self, request: Request) -> Tuple[datetime, datetime]:
        start_date = request.query_params.get("start_date", datetime.utcnow())
        end_date = request.query_params.get("end_date", datetime.utcnow())

        if type(start_date) == str:
            start_date = datetime.strptime(start_date, "%Y-%m-%d")
        start_date = datetime.combine(start_date, time.min)
        if type(end_date) == str:
            end_date = datetime.strptime(end_date, "%Y-%m-%d")
        end_date = datetime.combine(end_date, time.max)
        return start_date, end_date

    def summarize_stats_results(
        self, stats_set: List[dict], jobs_set: QuerySet[SpiderJob]
    ) -> dict:
        stats_mapping: dict = {
            "items_count": "item_scraped_count",
            "runtime": "elapsed_time_seconds",
            "scraped_pages": "downloader/response_status_count/200",
            "total_pages": "response_received_count",
            "status_codes": {
                "status_200": "downloader/response_status_count/200",
                "status_301": "downloader/response_status_count/301",
                "status_302": "downloader/response_status_count/302",
                "status_401": "downloader/response_status_count/401",
                "status_403": "downloader/response_status_count/403",
                "status_404": "downloader/response_status_count/404",
                "status_429": "downloader/response_status_count/429",
                "status_500": "downloader/response_status_count/500",
            },
            "logs": {
                "debug_logs": "log_count/DEBUG",
                "info_logs": "log_count/INFO",
                "warning_logs": "log_count/WARNING",
                "error_logs": "log_count/ERROR",
                "critical_logs": "log_count/CRITICAL",
            },
            "coverage": "coverage",
        }
        stats_results = defaultdict(lambda: defaultdict(int))
        stats_results.default_factory = lambda: {
            "jobs": {
                "total_jobs": 0,
                "error_jobs": 0,
                "unknown_jobs": 0,
                "running_jobs": 0,
                "finished_jobs": 0,
            },
            "pages": {
                "total_pages": 0,
                "scraped_pages": 0,
                "missed_pages": 0,
            },
            "items_count": 0,
            "runtime": 0.0,
            "status_codes": {
                "status_200": 0,
                "status_301": 0,
                "status_302": 0,
                "status_401": 0,
                "status_403": 0,
                "status_404": 0,
                "status_429": 0,
                "status_500": 0,
            },
            "success_rate": 0.0,
            "logs": {
                "total_logs": 0,
                "debug_logs": 0,
                "info_logs": 0,
                "warning_logs": 0,
                "error_logs": 0,
                "critical_logs": 0,
            },
            "coverage": {
                "total_items": 0,
                "total_items_coverage": 0.0,
            },
            "jobs_metadata": [],
        }
        jobs_ids = {job.jid: job.created.strftime("%Y-%m-%d") for job in jobs_set}
        for job in jobs_set:
            date_str = jobs_ids[job.jid]
            stats_results[date_str]["jobs"]["total_jobs"] += 1
            stats_results[date_str]["jobs"]["running_jobs"] += int(
                job.status == SpiderJob.RUNNING_STATUS
            )
            stats_results[date_str]["jobs"]["unknown_jobs"] += int(
                job.status != SpiderJob.ERROR_STATUS
                and job.status != SpiderJob.RUNNING_STATUS
                and job.status != SpiderJob.COMPLETED_STATUS
            )
            stats_results[date_str]["jobs"]["error_jobs"] += int(
                job.status == SpiderJob.ERROR_STATUS
            )
            stats_results[date_str]["jobs"]["finished_jobs"] += int(
                job.status == SpiderJob.COMPLETED_STATUS
            )
            job_metadata_serializer = JobsMetadataSerializer(job)
            stats_results[date_str]["jobs_metadata"].append(job_metadata_serializer.data)

        for stats in stats_set:
            job_id = int(findall(r"\d+", stats["_id"])[1])
            date_str = jobs_ids[job_id]
            stats_results[date_str]["items_count"] += stats.get(
                stats_mapping["items_count"], 0
            )

            stats_results[date_str]["runtime"] += stats.get(
                stats_mapping["runtime"], 0.0
            )

            stats_results[date_str]["pages"]["scraped_pages"] += stats.get(
                stats_mapping["scraped_pages"], 0
            )
            stats_results[date_str]["pages"]["missed_pages"] += stats.get(
                stats_mapping["total_pages"], 0
            ) - stats.get(stats_mapping["scraped_pages"], 0)
            stats_results[date_str]["pages"]["total_pages"] += stats.get(
                stats_mapping["total_pages"], 0
            )

            for status_code in stats_mapping["status_codes"]:
                stats_results[date_str]["status_codes"][status_code] += stats.get(
                    stats_mapping["status_codes"][status_code], 0
                )

            for log in stats_mapping["logs"]:
                log_count = stats.get(stats_mapping["logs"][log], 0)
                stats_results[date_str]["logs"][log] += log_count
                stats_results[date_str]["logs"]["total_logs"] += log_count

            coverage = stats.get(stats_mapping["coverage"], None)
            stats_results[date_str]["coverage"]["total_items"] += (
                coverage["total_items"] if coverage is not None else 0
            )
            stats_results[date_str]["coverage"]["total_items_coverage"] += (
                coverage["total_items_coverage"] if coverage is not None else 0
            )

        for stat in stats_results.values():
            if stat["jobs"]["finished_jobs"] != 0:
                stat["coverage"]["total_items_coverage"] /= stat["jobs"][
                    "finished_jobs"
                ]
            if stat["jobs"]["total_jobs"] != 0:
                stat["success_rate"] = 100 * (
                    stat["jobs"]["finished_jobs"] / stat["jobs"]["total_jobs"]
                )
        return stats_results

    
class GlobalStatsViewSet(BaseViewSet, StatsForDashboardMixin, mixins.ListModelMixin):
    model_class = Project
    lookup_field = "pid"

    @swagger_auto_schema(
        operation_description="Retrieve stats of all jobs in a range of time, dates must have the format YYYY-mm-dd.",
        manual_parameters=[
            openapi.Parameter(
                name="start_date",
                in_=openapi.IN_QUERY,
                type=openapi.TYPE_STRING,
                required=True,
                description="Start of date range (e.g. 2023-04-01).",
            ),
            openapi.Parameter(
                name="end_date",
                in_=openapi.IN_QUERY,
                type=openapi.TYPE_STRING,
                required=True,
                description="End of date range (e.g. 2023-04-30).",
            ),
        ],
        responses={
            status.HTTP_200_OK: openapi.Response(
                description="Global stats array with stats summary for each date",
                schema=ListSerializer(child=GlobalStatsSerializer()),
            ),
        },
    )
    def list(self, request: Request, *args, **kwargs):
        start_date, end_date = self.get_parameters(request)
        if not spiderdata_db_client.get_connection():
            raise DataBaseError({"error": errors.UNABLE_CONNECT_DB})

        sid_set = Spider.objects.filter(project=kwargs["pid"]).values_list(
            "pk", flat=True
        )

        jobs_set = SpiderJob.objects.filter(
            spider__in=sid_set, created__range=[start_date, end_date]
        )

        job_stats_ids: List[str] = [
            "{}-{}-job_stats".format(job.spider.sid, job.jid) for job in jobs_set
        ]

        stats_set: List[dict] = spiderdata_db_client.get_jobs_set_stats(
            kwargs["pid"], job_stats_ids
        )

        global_stats_results = self.summarize_stats_results(stats_set, jobs_set)
        response_schema = []
        for date, stat_result in global_stats_results.items():
            stat_serializer = StatsSerializer(data=stat_result)
            if stat_serializer.is_valid():
                response_schema.append({
                    "date": date, 
                    "stats": stat_serializer.data, 
                    "jobs_metadata": stat_result["jobs_metadata"]
                })

        return Response(
            data=response_schema,
            status=status.HTTP_200_OK,
        )

    @swagger_auto_schema(
        operation_description="Retrieve stats of all jobs metadata.",
        request_body=ListSerializer(child=JobsMetadataSerializer()),
        request_body_description="The list of jobs metadata to retrieve its stats.",
        responses={
            status.HTTP_200_OK: openapi.Response(
                description="Array with stats summary for each job",
                schema=ListSerializer(child=JobsStatsSerializer()),
            ),
        },
    )
    @action(methods=["GET"], detail=True)
    def jobs_stats(self, request: Request, *args, **kwargs):
        print(request.data)
        return Response(data=[], status=status.HTTP_200_OK)


class SpidersJobsStatsViewSet(
    BaseViewSet, StatsForDashboardMixin, mixins.ListModelMixin
):
    model_class = Spider
    lookup_field = "sid"

    @swagger_auto_schema(
        operation_description="Retrieve stats of all jobs of a spider in a range of time, dates must have the format YYYY-mm-dd.",
        manual_parameters=[
            openapi.Parameter(
                name="start_date",
                in_=openapi.IN_QUERY,
                type=openapi.TYPE_STRING,
                required=True,
                description="Start of date range (e.g. 2023-04-01).",
            ),
            openapi.Parameter(
                name="end_date",
                in_=openapi.IN_QUERY,
                type=openapi.TYPE_STRING,
                required=True,
                description="End of date range (e.g. 2023-04-30).",
            ),
        ],
        responses={
            status.HTTP_200_OK: openapi.Response(
                description="Spiders/Jobs stats array with stats summary for each date",
                schema=ListSerializer(child=SpidersJobsStatsSerializer()),
            ),
        },
    )
    def list(self, request, *args, **kwargs):
        start_date, end_date = self.get_parameters(request)

        if not spiderdata_db_client.get_connection():
            raise ConnectionError({"error": errors.UNABLE_CONNECT_DB})

        spider: Spider = Spider.objects.get(sid=kwargs["sid"])
        jobs_set: QuerySet[SpiderJob] = spider.jobs.filter(
            created__range=[start_date, end_date]
        )

        job_stats_ids: List[str] = [
            "{}-{}-job_stats".format(job.spider.sid, job.jid) for job in jobs_set
        ]

        stats_set: List[dict] = spiderdata_db_client.get_jobs_set_stats(
            kwargs["pid"], job_stats_ids
        )

        spider_jobs_stats_results: dict = self.summarize_stats_results(
            stats_set, jobs_set
        )

        response_schema = []
        for date, stat_result in spider_jobs_stats_results.items():
            stat_serializer = StatsSerializer(data=stat_result)
            if stat_serializer.is_valid():
                response_schema.append({
                    "date": date, 
                    "stats": stat_serializer.data, 
                    "jobs_metadata": stat_result["jobs_metadata"]
                })

        return Response(
            data=response_schema,
            status=status.HTTP_200_OK,
        )
