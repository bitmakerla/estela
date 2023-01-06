import csv
import codecs

from django.http.response import JsonResponse, HttpResponse
from django.conf import settings
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import status, mixins
from rest_framework.response import Response
from rest_framework.exceptions import ParseError
from rest_framework.decorators import action
from rest_framework.utils.urls import replace_query_param

from api import errors
from api.exceptions import DataBaseError
from api.mixins import BaseViewSet
from api.serializers.job import DeleteJobDataSerializer
from config.job_manager import spiderdata_db_client
from core.models import SpiderJob
from core.tasks import record_project_usage_after_data_delete


class JobDataViewSet(
    BaseViewSet,
    mixins.ListModelMixin,
):
    MAX_PAGINATION_SIZE = 100
    MIN_PAGINATION_SIZE = 1
    DEFAULT_PAGINATION_SIZE = 50
    JOB_DATA_TYPES = ["items", "requests", "logs", "stats"]

    def get_parameters(self, request):
        page = int(request.query_params.get("page", 1))
        data_type = request.query_params.get("type", "items")
        mode = request.query_params.get("mode", "paged")
        page_size = int(
            request.query_params.get("page_size", self.DEFAULT_PAGINATION_SIZE)
        )
        export_format = request.query_params.get("format", "json")
        return page, data_type, mode, page_size, export_format

    def get_paginated_link(self, page_number):
        if page_number < 1:
            return None
        url = self.request.build_absolute_uri()
        return replace_query_param(url, "page", page_number)

    @swagger_auto_schema(
        responses={
            status.HTTP_200_OK: openapi.Response(
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    required=["count", "result"],
                    properties={
                        "count": openapi.Schema(
                            type=openapi.TYPE_NUMBER, description="Data items count."
                        ),
                        "previous": openapi.Schema(
                            type=openapi.TYPE_STRING,
                            format=openapi.FORMAT_URI,
                            x_nullable=True,
                            description="URI to the previous data chunk.",
                        ),
                        "next": openapi.Schema(
                            type=openapi.TYPE_STRING,
                            format=openapi.FORMAT_URI,
                            x_nullable=True,
                            description="URI to the next data chunk.",
                        ),
                        "results": openapi.Schema(
                            type=openapi.TYPE_ARRAY,
                            items=openapi.Items(type=openapi.TYPE_OBJECT),
                            description="Data items.",
                        ),
                    },
                ),
                description="",
            ),
        },
        manual_parameters=[
            openapi.Parameter(
                "type",
                openapi.IN_QUERY,
                description="Spider job data type.",
                type=openapi.TYPE_STRING,
                required=False,
            ),
        ],
    )
    def list(self, request, *args, **kwargs):
        page, data_type, mode, page_size, export_format = self.get_parameters(request)
        if page_size > self.MAX_PAGINATION_SIZE or page_size < self.MIN_PAGINATION_SIZE:
            raise ParseError({"error": errors.INVALID_PAGE_SIZE})
        if page_size < 1:
            raise ParseError({"error": errors.INVALID_PAGE_SIZE})
        if data_type not in self.JOB_DATA_TYPES:
            raise ParseError({"error": errors.INVALID_PAGE_SIZE})
        job = SpiderJob.objects.filter(jid=kwargs["jid"]).get()
        if not spiderdata_db_client.get_connection():
            raise DataBaseError({"error": errors.UNABLE_CONNECT_DB})
        if (
            job.cronjob is not None
            and job.cronjob.unique_collection
            and data_type == "items"
        ):
            job_collection_name = "{}-scj{}-job_{}".format(
                kwargs["sid"], job.cronjob.cjid, data_type
            )
        else:
            job_collection_name = "{}-{}-job_{}".format(
                kwargs["sid"], kwargs["jid"], data_type
            )

        if mode != "paged":
            collection_size = spiderdata_db_client.get_collection_size(
                kwargs["pid"], job_collection_name
            )
            if collection_size > settings.MAX_DOWNLOADED_SIZE:
                return Response(
                    {"detail": errors.MAX_RESPONSE_SIZE_EXCEEDED},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            result = spiderdata_db_client.get_all_collection_data(
                kwargs["pid"], job_collection_name
            )
            if mode == "json":
                response = JsonResponse(result, safe=False)
                return response
            if mode == "csv":
                response = HttpResponse(content_type="text/csv; charset=utf-8")
                response["Content-Disposition"] = "attachment; {}.csv".format(
                    job_collection_name
                )
                # Force response to be UTF-8 - This is where the magic happens
                response.write(codecs.BOM_UTF8)
                csv_writer = csv.DictWriter(response, fieldnames=result[0].keys())
                csv_writer.writeheader()

                for item in result:
                    csv_writer.writerow(item)

                return response
        else:
            result = spiderdata_db_client.get_paginated_collection_data(
                kwargs["pid"], job_collection_name, page, page_size
            )
            count = spiderdata_db_client.get_estimated_document_count()

            return Response(
                {
                    "count": count,
                    "previous": self.get_paginated_link(page - 1),
                    "next": self.get_paginated_link(page + 1)
                    if page * page_size < count
                    else None,
                    "results": result,
                }
            )

    @swagger_auto_schema(
        methods=["POST"],
        responses={status.HTTP_200_OK: DeleteJobDataSerializer()},
        manual_parameters=[
            openapi.Parameter(
                "type",
                openapi.IN_QUERY,
                description="Spider job data type.",
                type=openapi.TYPE_STRING,
                required=True,
            ),
        ],
    )
    @action(methods=["POST"], detail=False)
    def delete(self, request, *args, **kwargs):
        job = SpiderJob.objects.filter(jid=kwargs["jid"]).get()
        data_type = request.query_params.get("type")
        if not spiderdata_db_client.get_connection():
            raise DataBaseError({"error": errors.UNABLE_CONNECT_DB})
        if (
            job.cronjob is not None
            and job.cronjob.unique_collection
            and data_type == "items"
        ):
            job_collection_name = "{}-scj{}-job_{}".format(
                kwargs["sid"], job.cronjob.cjid, data_type
            )
        else:
            job_collection_name = "{}-{}-job_{}".format(
                kwargs["sid"], kwargs["jid"], data_type
            )

        count = spiderdata_db_client.delete_collection_data(
            kwargs["pid"], job_collection_name
        )
        record_project_usage_after_data_delete.s(
            job.spider.project.pid, job.jid
        ).apply_async()

        return Response(
            {
                "count": count,
            },
            status=status.HTTP_200_OK,
        )
