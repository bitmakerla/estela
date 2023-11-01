import redis

from django.conf import settings
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import mixins, status
from rest_framework.decorators import action
from rest_framework.exceptions import ParseError
from rest_framework.response import Response
from rest_framework.utils.urls import replace_query_param

from api import errors
from api.exceptions import DataBaseError
from api.mixins import BaseViewSet
from api.serializers.job import DeleteJobDataSerializer
from config.job_manager import spiderdata_db_client
from core.models import SpiderJob
from core.tasks import get_chain_to_process_usage_data


class JobDataViewSet(
    BaseViewSet,
    mixins.ListModelMixin,
):
    MAX_PAGINATION_SIZE = 100
    MIN_PAGINATION_SIZE = 1
    DEFAULT_PAGINATION_SIZE = 50
    JOB_DATA_TYPES = ["items", "requests", "logs", "stats"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.redis_conn = redis.from_url(settings.REDIS_URL)

    def get_parameters(self, request):
        page = int(request.query_params.get("page", 1))
        data_type = request.query_params.get("type", "items")
        page_size = int(
            request.query_params.get("page_size", self.DEFAULT_PAGINATION_SIZE)
        )
        return page, data_type, page_size

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
        page, data_type, page_size = self.get_parameters(request)
        if page_size > self.MAX_PAGINATION_SIZE or page_size < self.MIN_PAGINATION_SIZE:
            raise ParseError({"error": errors.INVALID_PAGE_SIZE})
        if page_size < 1:
            raise ParseError({"error": errors.INVALID_PAGE_SIZE})
        if data_type not in self.JOB_DATA_TYPES:
            raise ParseError({"error": errors.INVALID_PAGE_SIZE})
        if not spiderdata_db_client.get_connection():
            raise DataBaseError({"error": errors.UNABLE_CONNECT_DB})

        job = SpiderJob.objects.filter(jid=kwargs["jid"]).get()
        job_collection_name = self.get_collection_name(job, data_type, **kwargs)

        count = spiderdata_db_client.get_estimated_document_count(
            kwargs["pid"], job_collection_name
        )

        if data_type == "stats":
            if job.status == SpiderJob.RUNNING_STATUS:
                job_stats = self.redis_conn.hgetall(f"scrapy_stats_{job.key}")
                parsed_job_stats = {
                    key.decode(): value.decode() for key, value in job_stats.items()
                }
                result = [parsed_job_stats]
            else:
                result = spiderdata_db_client.get_job_stats(
                    kwargs["pid"], job_collection_name
                )
        elif request.META["HTTP_USER_AGENT"].startswith("estela-cli/"):
            chunk_size = max(
                1,
                settings.MAX_CLI_DOWNLOAD_CHUNK_SIZE
                // spiderdata_db_client.get_estimated_document_size(
                    kwargs["pid"], job_collection_name
                ),
            )
            current_chunk = request.query_params.get("current_chunk", None)
            result, next_chunk = spiderdata_db_client.get_chunked_collection_data(
                kwargs["pid"], job_collection_name, chunk_size, current_chunk
            )
            response = {"count": count, "results": result}
            if next_chunk:
                response["next_chunk"] = next_chunk
            return Response(response)
        else:
            result = spiderdata_db_client.get_paginated_collection_data(
                kwargs["pid"], job_collection_name, page, page_size
            )

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

    def get_collection_name(self, job, data_type, **kwargs):
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

        return job_collection_name

    @swagger_auto_schema(
        methods=["GET"],
        responses={
            status.HTTP_200_OK: openapi.Response(
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    required=["results"],
                    properties={
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
    @action(detail=False, methods=["GET"])
    def download(self, request, *args, **kwargs):
        data_type = request.query_params.get("type", "items")

        job = SpiderJob.objects.filter(jid=kwargs["jid"]).get()
        job_collection_name = self.get_collection_name(job, data_type, **kwargs)

        data = []
        if data_type == "stats":
            data = spiderdata_db_client.get_job_stats(
                kwargs["pid"], job_collection_name
            )
        else:
            docs_limit = max(
                1,
                settings.MAX_WEB_DOWNLOAD_SIZE
                // spiderdata_db_client.get_estimated_document_size(
                    kwargs["pid"], job_collection_name
                ),
            )
            data = spiderdata_db_client.get_collection_data(
                kwargs["pid"], job_collection_name, docs_limit
            )

        return Response({"results": data})

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

        job_collection_name = self.get_collection_name(
            job, data_type, kwargs["sid"], kwargs["jid"]
        )
        count = spiderdata_db_client.delete_collection_data(
            kwargs["pid"], job_collection_name
        )
        chain_of_usage_process = get_chain_to_process_usage_data(
            after_delete=True, project_id=job.spider.project.pid, job_id=job.jid
        )
        chain_of_usage_process.apply_async()

        return Response(
            {
                "count": count,
            },
            status=status.HTTP_200_OK,
        )
