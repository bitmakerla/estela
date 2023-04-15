from datetime import datetime
from threading import Thread, Lock
from multiprocessing import Process
from typing import List

from django.core.paginator import Paginator
from django.http.response import JsonResponse, HttpResponse
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import status, viewsets, mixins
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, ParseError, PermissionDenied
from rest_framework.response import Response
from rest_framework.utils.urls import replace_query_param
from bson.json_util import dumps

from api import errors
from api.exceptions import DataBaseError
from api.mixins import BaseViewSet

from config.job_manager import spiderdata_db_client

from core.models import (
    Project,
    Spider,
    SpiderJob,
)


# class StatsViewSet(BaseViewSet, viewsets.ModelViewSet):
class OverallStatsViewSet(BaseViewSet, mixins.ListModelMixin):
    model_class = Project
    lookup_field = "pid"

    MAX_PAGINATION_SIZE = 100
    MIN_PAGINATION_SIZE = 1
    DEFAULT_PAGINATION_SIZE = 50

    def get_parameters(self, request):
        page = int(request.query_params.get("page", 1))
        page_size = int(
            request.query_params.get("page_size", self.DEFAULT_PAGINATION_SIZE)
        )
        return page, page_size

    def get_paginated_link(self, page_number):
        if page_number < 1:
            return None
        url = self.request.build_absolute_uri()
        return replace_query_param(url, "page", page_number)

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
    )
    def list(self, request, *args, **kwargs):
        start_date = request.query_params.get(
            "start_date", datetime.today().replace(day=1)
        )
        end_date = request.query_params.get("end_date", datetime.today().replace(day=1))
        if not spiderdata_db_client.get_connection():
            raise DataBaseError({"error": errors.UNABLE_CONNECT_DB})

        spiders_set = Spider.objects.filter(project=kwargs["pid"])
        sid_set = spiders_set.values_list("pk", flat=True)
        jobs_set = SpiderJob.objects.filter(
            spider__in=sid_set, created__range=[start_date, end_date]
        )
        # For coverage is there a function mon mongodb to count the ocurrences of each field
        # for an object in a collection?
        result = {}
        lock = Lock()
        def get_collection_data(collection_name, date: str):
            doc = spiderdata_db_client.get_all_collection_data(
                kwargs["pid"], collection_name
            )
            with lock:
                if result.get(date) is not None:
                    result[date].append(doc)
                else:
                    result[date] = [doc]

        threads:List[Thread] = []
        for job in jobs_set:
            job_collection_name = ""
            # No considerar este caso con cronjob
            if job.cronjob is not None and job.cronjob.unique_collection:
                job_collection_name = "{}-scj{}-job_stats".format(
                    job.spider.sid, job.cronjob.cjid
                )
            else:
                job_collection_name = "{}-{}-job_stats".format(job.spider.sid, job.jid)
            
            t = Thread(
                target=get_collection_data, 
                args=(job_collection_name, job.created.strftime("%Y-%m-%d"),)
            )
            threads.append(t)
            t.start()

        for t in threads:
            t.join()

        # Error race condition
        # processes:List[Process] = []
        # for job in jobs_set:
        #     job_collection_name = ""
        #     if job.cronjob is not None and job.cronjob.unique_collection:
        #         job_collection_name = "{}-scj{}-job_stats".format(
        #             job.spider.sid, job.cronjob.cjid
        #         )
        #     else:
        #         job_collection_name = "{}-{}-job_stats".format(job.spider.sid, job.jid)
            
        #     p = Process(
        #         target=get_collection_data, 
        #         args=(job_collection_name,)
        #     )
        #     processes.append(p)
        #     p.start()

        # for p in processes:
        #     p.join()
        
        return JsonResponse(result, safe=False)

class SpidersJobsStatsViewSet(BaseViewSet, mixins.ListModelMixin):
    model_class = Spider
    lookup_field = "sid"

    MAX_PAGINATION_SIZE = 100
    MIN_PAGINATION_SIZE = 1
    DEFAULT_PAGINATION_SIZE = 50

    def get_parameters(self, request):
        page = int(request.query_params.get("page", 1))
        page_size = int(
            request.query_params.get("page_size", self.DEFAULT_PAGINATION_SIZE)
        )
        return page, page_size

    def get_paginated_link(self, page_number):
        if page_number < 1:
            return None
        url = self.request.build_absolute_uri()
        return replace_query_param(url, "page", page_number)

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
    )
    def list(self, request, *args, **kwargs):
        start_date = request.query_params.get(
            "start_date", datetime.today().replace(day=1)
        )
        end_date = request.query_params.get("end_date", datetime.today().replace(day=1))
        if not spiderdata_db_client.get_connection():
            raise DataBaseError({"error": errors.UNABLE_CONNECT_DB})

        
        jobs_set = SpiderJob.objects.filter(
            spider__in=kwargs["sid"], created__range=[start_date, end_date]
        )

        result = []
        lock = Lock()
        def get_collection_data(collection_name):
            doc = spiderdata_db_client.get_all_collection_data(
                kwargs["pid"], collection_name
            )
            with lock:
                result.extend(doc)

        threads:List[Thread] = []
        for job in jobs_set:
            job_collection_name = ""
            if job.cronjob is not None and job.cronjob.unique_collection:
                job_collection_name = "{}-scj{}-job_stats".format(
                    job.spider.sid, job.cronjob.cjid
                )
            else:
                job_collection_name = "{}-{}-job_stats".format(job.spider.sid, job.jid)
            
            t = Thread(
                target=get_collection_data, 
                args=(job_collection_name,)
            )
            threads.append(t)
            t.start()

        for t in threads:
            t.join()
        
        print(dumps(result))
        return Response(status=status.HTTP_200_OK)
