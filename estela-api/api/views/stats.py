from collections import defaultdict
from datetime import datetime, timedelta
from re import findall
from typing import List, Tuple

from django.db.models.query import QuerySet
from django.utils import timezone
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import mixins, status
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.serializers import ListSerializer

from api import errors
from api.exceptions import DataBaseError, InvalidDateFormatException
from api.mixins import BaseViewSet
from api.serializers.spider import SpiderSerializer
from api.serializers.job import SpiderJobSerializer
from api.serializers.stats import (
    ProjectStatsSerializer,
    SpidersStatsSerializer,
    StatsSerializer,
    SpidersPaginationSerializer,
    JobsPaginationSerializer,
)
from config.job_manager import spiderdata_db_client
from core.models import Project, Spider, SpiderJob


class StatsMixin:
    numerical_stats: dict = {
        "items_count": 0,
        "runtime": timedelta(seconds=0),
        "success_rate": 0.0,
    }
    pages_stats: dict = {
        "total_pages": 0,
        "scraped_pages": 0,
        "missed_pages": 0,
    }
    jobs_stats: dict = {
        "total_jobs": 0,
        "waiting_jobs": 0,
        "running_jobs": 0,
        "stopped_jobs": 0,
        "completed_jobs": 0,
        "in_queue_jobs": 0,
        "error_jobs": 0,
    }
    status_codes_stats: dict = {
        "status_200": 0,
        "status_301": 0,
        "status_302": 0,
        "status_401": 0,
        "status_403": 0,
        "status_404": 0,
        "status_429": 0,
        "status_500": 0,
    }
    logs_stats: dict = {
        "total_logs": 0,
        "debug_logs": 0,
        "info_logs": 0,
        "warning_logs": 0,
        "error_logs": 0,
        "critical_logs": 0,
    }
    coverage_stats: dict = {
        "total_items": 0,
        "total_items_coverage": 0.0,
    }
    stats_mapping: dict = {
        "jobs": {
            "waiting_jobs": SpiderJob.WAITING_STATUS,
            "running_jobs": SpiderJob.RUNNING_STATUS,
            "stopped_jobs": SpiderJob.STOPPED_STATUS,
            "completed_jobs": SpiderJob.COMPLETED_STATUS,
            "in_queue_jobs": SpiderJob.IN_QUEUE_STATUS,
            "error_jobs": SpiderJob.ERROR_STATUS,
        },
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

    def get_parameters(self, request: Request) -> Tuple[datetime, datetime]:
        try:
            offset = int(request.query_params.get("offset", 0))
        except (ValueError, TypeError):
            raise TypeError()

        try:
            start_date = request.query_params.get(
                "start_date", timezone.now().strftime("%Y-%m-%d")
            )
            end_date = request.query_params.get(
                "end_date", timezone.now().strftime("%Y-%m-%d")
            )

            start_date = datetime.strptime(start_date, "%Y-%m-%d").replace(
                hour=0, minute=0, second=0, microsecond=0
            )
            end_date = datetime.strptime(end_date, "%Y-%m-%d").replace(
                hour=23, minute=59, second=59, microsecond=999999
            )
        except ValueError:
            raise InvalidDateFormatException()
        return start_date, end_date, offset

    def summarize_stats_results(
        self, stats_set: List[dict], jobs_set: QuerySet[SpiderJob], offset: int
    ) -> dict:
        stats_results = defaultdict(lambda: defaultdict(int))
        stats_results.default_factory = lambda: {
            **self.numerical_stats,
            "jobs": {**self.jobs_stats},
            "pages": {**self.pages_stats},
            "status_codes": {**self.status_codes_stats},
            "logs": {**self.logs_stats},
            "coverage": {**self.coverage_stats},
        }
        jobs_offset = {
            job.jid: (job.created - timedelta(minutes=offset)).strftime("%Y-%m-%d")
            for job in jobs_set
        }

        for job in jobs_set:
            date_str = jobs_offset[job.jid]
            stats_results[date_str]["jobs"]["total_jobs"] += 1
            for (key, value) in self.stats_mapping["jobs"].items():
                stats_results[date_str]["jobs"][key] += int(job.status == value)
            stats_results[date_str]["runtime"] += job.lifespan

        for stats in stats_set:
            job_id = int(findall(r"\d+", stats["_id"])[1])
            date_str = jobs_offset[job_id]
            stats_results[date_str]["items_count"] += stats.get(
                self.stats_mapping["items_count"], 0
            )

            stats_results[date_str]["pages"]["scraped_pages"] += stats.get(
                self.stats_mapping["scraped_pages"], 0
            )
            stats_results[date_str]["pages"]["missed_pages"] += stats.get(
                self.stats_mapping["total_pages"], 0
            ) - stats.get(self.stats_mapping["scraped_pages"], 0)
            stats_results[date_str]["pages"]["total_pages"] += stats.get(
                self.stats_mapping["total_pages"], 0
            )

            for status_code in self.stats_mapping["status_codes"]:
                stats_results[date_str]["status_codes"][status_code] += stats.get(
                    self.stats_mapping["status_codes"][status_code], 0
                )

            for log in self.stats_mapping["logs"]:
                log_count = stats.get(self.stats_mapping["logs"][log], 0)
                stats_results[date_str]["logs"][log] += log_count
                stats_results[date_str]["logs"]["total_logs"] += log_count

            coverage = stats.get(self.stats_mapping["coverage"], None)
            stats_results[date_str]["coverage"]["total_items"] += (
                coverage["total_items"] if coverage is not None else 0
            )
            stats_results[date_str]["coverage"]["total_items_coverage"] += (
                coverage["total_items_coverage"] if coverage is not None else 0
            )

        for stat in stats_results.values():
            stat["runtime"] = str(stat["runtime"])
            if stat["jobs"]["completed_jobs"] != 0:
                stat["coverage"]["total_items_coverage"] /= stat["jobs"][
                    "completed_jobs"
                ]
            if stat["jobs"]["total_jobs"] != 0:
                stat["success_rate"] = 100 * (
                    stat["jobs"]["completed_jobs"] / stat["jobs"]["total_jobs"]
                )
        return stats_results

    def parse_jobs_stats(self, stats_set: List[dict]) -> dict:
        stats_results = defaultdict(lambda: defaultdict(int))
        stats_results.default_factory = lambda: {
            **self.numerical_stats,
            "pages": {**self.pages_stats},
            "status_codes": {**self.status_codes_stats},
            "logs": {**self.logs_stats},
        }

        for stats in stats_set:
            job_id = int(findall(r"\d+", stats["_id"])[1])
            stats_results[job_id]["pages"]["scraped_pages"] = stats.get(
                self.stats_mapping["scraped_pages"], 0
            )
            stats_results[job_id]["pages"]["missed_pages"] = stats.get(
                self.stats_mapping["total_pages"], 0
            ) - stats.get(self.stats_mapping["scraped_pages"], 0)
            stats_results[job_id]["pages"]["total_pages"] = stats.get(
                self.stats_mapping["total_pages"], 0
            )

            stats_results[job_id]["items_count"] = stats.get(
                self.stats_mapping["items_count"], 0
            )

            stats_results[job_id]["runtime"] = str(
                timedelta(seconds=stats.get(self.stats_mapping["runtime"], 0.0))
            )

            for status_code in self.stats_mapping["status_codes"]:
                stats_results[job_id]["status_codes"][status_code] = stats.get(
                    self.stats_mapping["status_codes"][status_code], 0
                )

            for log in self.stats_mapping["logs"]:
                log_count = stats.get(self.stats_mapping["logs"][log], 0)
                stats_results[job_id]["logs"][log] = log_count
                stats_results[job_id]["logs"]["total_logs"] += log_count

        return stats_results


class ProjectStatsViewSet(BaseViewSet, StatsMixin, mixins.ListModelMixin):
    model_class = Project
    lookup_field = "pid"
    MAX_PAGINATION_SIZE = 100
    MIN_PAGINATION_SIZE = 1
    DEFAULT_PAGINATION_SIZE = 10

    @swagger_auto_schema(
        operation_description="Retrieve stats of all jobs in a range of time, dates must have the format YYYY-mm-dd.",
        manual_parameters=[
            openapi.Parameter(
                name="start_date",
                in_=openapi.IN_QUERY,
                type=openapi.TYPE_STRING,
                required=True,
                description="Start of date in format [%Y-%m-%d] (e.g. 2023-04-01).",
            ),
            openapi.Parameter(
                name="end_date",
                in_=openapi.IN_QUERY,
                type=openapi.TYPE_STRING,
                required=True,
                description="End of date in format [%Y-%m-%d] (e.g. 2023-06-02).",
            ),
            openapi.Parameter(
                name="offset",
                in_=openapi.IN_QUERY,
                type=openapi.TYPE_INTEGER,
                required=False,
                description="Offset between your local timezone and UTC in 'minutes'.",
            ),
        ],
        responses={
            status.HTTP_200_OK: openapi.Response(
                description="Global stats array with stats summary for each date",
                schema=ListSerializer(child=ProjectStatsSerializer()),
            ),
        },
    )
    def list(self, request: Request, *args, **kwargs):
        try:
            start_date, end_date, offset = self.get_parameters(request)
        except (ValueError, TypeError):
            return Response(
                {"error": "Invalid 'offset' parameter. Must be an integer."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except InvalidDateFormatException as e:
            return Response({"error": str(e.detail)}, status=e.status_code)

        start_date, end_date = start_date + timedelta(
            minutes=offset
        ), end_date + timedelta(minutes=offset)

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

        global_stats_results = self.summarize_stats_results(stats_set, jobs_set, offset)

        response_schema = []
        for (date_stat, stat_result) in global_stats_results.items():
            stat_serializer = StatsSerializer(data=stat_result)
            if stat_serializer.is_valid(raise_exception=True):
                response_schema.append(
                    {
                        "date": datetime.strptime(date_stat, "%Y-%m-%d"),
                        "stats": stat_serializer.data,
                    }
                )

        return Response(
            data=response_schema,
            status=status.HTTP_200_OK,
        )

    @swagger_auto_schema(
        methods=["GET"],
        operation_description="Retrieve all the spiders executed in a range of dates.",
        manual_parameters=[
            openapi.Parameter(
                name="start_date",
                in_=openapi.IN_QUERY,
                type=openapi.TYPE_STRING,
                required=True,
                description="Start of date in UTC format [%Y-%m-%dT%H:%M:%S.%fZ] (e.g. 2023-04-01T05%3A00%3A00.000Z).",
            ),
            openapi.Parameter(
                name="end_date",
                in_=openapi.IN_QUERY,
                type=openapi.TYPE_STRING,
                required=True,
                description="End of date in UTC format [%Y-%m-%dT%H:%M:%S.%fZ] (e.g. 2023-06-02T04%3A59%3A59.999Z).",
            ),
            openapi.Parameter(
                name="offset",
                in_=openapi.IN_QUERY,
                type=openapi.TYPE_INTEGER,
                required=False,
                description="Offset between your local timezone and UTC in 'minutes'.",
            ),
        ],
        responses={
            status.HTTP_200_OK: openapi.Response(
                description="Paginated spiders launched in a range of time",
                schema=SpidersPaginationSerializer(),
            ),
        },
    )
    @action(methods=["GET"], detail=False)
    def spiders(self, request: Request, *args, **kwargs):
        try:
            start_date, end_date, offset = self.get_parameters(request)
        except (ValueError, TypeError):
            return Response(
                {"error": "Invalid 'offset' parameter. Must be an integer."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except InvalidDateFormatException as e:
            return Response({"error": str(e.detail)}, status=e.status_code)

        start_date, end_date = start_date + timedelta(
            minutes=offset
        ), end_date + timedelta(minutes=offset)

        paginator = PageNumberPagination()
        paginator.page = request.query_params.get("page", 1)
        paginator.page_size = request.query_params.get(
            "page_size", self.DEFAULT_PAGINATION_SIZE
        )
        paginator.max_page_size = self.MAX_PAGINATION_SIZE

        spiders_set = Spider.objects.filter(
            project=kwargs["pid"], jobs__created__range=[start_date, end_date]
        ).distinct()
        paginated_spiders_set = paginator.paginate_queryset(spiders_set, request)

        serializer = SpiderSerializer(paginated_spiders_set, many=True)
        return paginator.get_paginated_response(serializer.data)


class SpidersJobsStatsViewSet(BaseViewSet, StatsMixin, mixins.ListModelMixin):
    model_class = Spider
    lookup_field = "sid"
    MAX_PAGINATION_SIZE = 100
    MIN_PAGINATION_SIZE = 1
    DEFAULT_PAGINATION_SIZE = 10

    @swagger_auto_schema(
        operation_description="Retrieve stats of all jobs of a spider in a range of time, dates must have the format YYYY-mm-dd.",
        manual_parameters=[
            openapi.Parameter(
                name="start_date",
                in_=openapi.IN_QUERY,
                type=openapi.TYPE_STRING,
                required=True,
                description="Start of date in UTC format [%Y-%m-%dT%H:%M:%S.%fZ] (e.g. 2023-04-01T05%3A00%3A00.000Z).",
            ),
            openapi.Parameter(
                name="end_date",
                in_=openapi.IN_QUERY,
                type=openapi.TYPE_STRING,
                required=True,
                description="End of date in UTC format [%Y-%m-%dT%H:%M:%S.%fZ] (e.g. 2023-06-02T04%3A59%3A59.999Z).",
            ),
            openapi.Parameter(
                name="offset",
                in_=openapi.IN_QUERY,
                type=openapi.TYPE_INTEGER,
                required=False,
                description="Offset between your local timezone and UTC in 'minutes'.",
            ),
        ],
        responses={
            status.HTTP_200_OK: openapi.Response(
                description="Spiders/Jobs stats array with stats summary for each date",
                schema=ListSerializer(child=SpidersStatsSerializer()),
            ),
        },
    )
    def list(self, request: Request, *args, **kwargs):
        try:
            start_date, end_date, offset = self.get_parameters(request)
        except (ValueError, TypeError):
            return Response(
                {"error": "Invalid 'offset' parameter. Must be an integer."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except InvalidDateFormatException as e:
            return Response({"error": str(e.detail)}, status=e.status_code)

        start_date, end_date = start_date + timedelta(
            minutes=offset
        ), end_date + timedelta(minutes=offset)

        if not spiderdata_db_client.get_connection():
            raise ConnectionError({"error": errors.UNABLE_CONNECT_DB})

        spider = Spider.objects.get(sid=kwargs["sid"])
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
            stats_set, jobs_set, offset
        )

        response_schema = []
        for (date_stat, stat_result) in spider_jobs_stats_results.items():
            stat_serializer = StatsSerializer(data=stat_result)
            if stat_serializer.is_valid():
                response_schema.append(
                    {
                        "date": datetime.strptime(date_stat, "%Y-%m-%d"),
                        "stats": stat_serializer.data,
                    }
                )

        return Response(
            data=response_schema,
            status=status.HTTP_200_OK,
        )

    @swagger_auto_schema(
        operation_description="Retrieve all the jobs of a spider executed in a range of dates.",
        manual_parameters=[
            openapi.Parameter(
                name="start_date",
                in_=openapi.IN_QUERY,
                type=openapi.TYPE_STRING,
                required=True,
                description="Start of date in UTC format [%Y-%m-%dT%H:%M:%S.%fZ] (e.g. 2023-04-01T05%3A00%3A00.000Z).",
            ),
            openapi.Parameter(
                name="end_date",
                in_=openapi.IN_QUERY,
                type=openapi.TYPE_STRING,
                required=True,
                description="End of date in UTC format [%Y-%m-%dT%H:%M:%S.%fZ] (e.g. 2023-06-02T04%3A59%3A59.999Z).",
            ),
            openapi.Parameter(
                name="offset",
                in_=openapi.IN_QUERY,
                type=openapi.TYPE_INTEGER,
                required=False,
                description="Offset between your local timezone and UTC in 'minutes'.",
            ),
        ],
        responses={
            status.HTTP_200_OK: openapi.Response(
                description="Paginated jobs belonging to a spider in a range of time",
                schema=JobsPaginationSerializer(),
            ),
        },
    )
    @action(methods=["GET"], detail=False)
    def jobs(self, request: Request, *args, **kwargs):
        try:
            start_date, end_date, offset = self.get_parameters(request)
        except (ValueError, TypeError):
            return Response(
                {"error": "Invalid 'offset' parameter. Must be an integer."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except InvalidDateFormatException as e:
            return Response({"error": str(e.detail)}, status=e.status_code)

        start_date, end_date = start_date + timedelta(
            minutes=offset
        ), end_date + timedelta(minutes=offset)

        if not spiderdata_db_client.get_connection():
            raise DataBaseError({"error": errors.UNABLE_CONNECT_DB})

        paginator = PageNumberPagination()
        paginator.page = request.query_params.get("page", 1)
        paginator.page_size = request.query_params.get(
            "page_size", self.DEFAULT_PAGINATION_SIZE
        )
        paginator.max_page_size = self.MAX_PAGINATION_SIZE

        jobs_set = SpiderJob.objects.filter(
            spider=kwargs["sid"], created__range=[start_date, end_date]
        )

        paginated_jobs_set = paginator.paginate_queryset(jobs_set, request)

        jobs_stats_ids: List[str] = [
            "{}-{}-job_stats".format(job.spider.sid, job.jid)
            for job in paginated_jobs_set
        ]
        stats_set: List[dict] = spiderdata_db_client.get_jobs_set_stats(
            kwargs["pid"], jobs_stats_ids
        )

        stats_results: dict = self.parse_jobs_stats(stats_set=stats_set)
        serializer = SpiderJobSerializer(paginated_jobs_set, many=True)
        response_schema = []
        for job in serializer.data:
            job_id = job.get("jid", None)
            response_schema.append({**job, "stats": stats_results[job_id]})
        return paginator.get_paginated_response(response_schema)
