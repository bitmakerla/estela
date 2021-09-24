from ***REMOVED***.shortcuts import get_object_or_404
from drf_yasg.utils import swagger_auto_schema
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
import pymongo
import os
from bson.json_util import loads, dumps
import json

from api import errors
from api.mixins import BaseViewSet

from core.kubernetes import delete_job, create_job
from core.models import Spider, SpiderJob
from core.mongo import get_client


class RetrieveDataViewSet(
    BaseViewSet,
    viewsets.ReadOnlyModelViewSet,
):
    def get_queryset(self):
        return self.model_class.objects.filter(
            spider__project__pid=self.kwargs["pid"],
            spider__sid=self.kwargs["sid"],
            job_jid=self.kwargs["jid"],
        )

    def list(self, request, *args, **kwargs):
        page = int(request.query_params.get("page", 1)) - 1
        data_type = request.query_params.get("type", "items")
        page_size = int(request.query_params.get("page_size", 10))
        db_connection = os.getenv("MONGO_CONNECTION")
        client = get_client(db_connection)
        if not client:
            return Response(
                {"error": errors.UNABLE_CONNECT_DB},
                status=status.HTTP_404_NOT_FOUND,
            )
        current_collection = "{}-{}-job_{}".format(
            kwargs["sid"], kwargs["jid"], data_type
        )
        result = (
            client[kwargs["pid"]][current_collection]
            .find()
            .skip(page_size * page)
            .limit(page_size)
        )
        result = loads(json.dumps(list(result), default=str))
        return Response(result, status=status.HTTP_200_OK)
