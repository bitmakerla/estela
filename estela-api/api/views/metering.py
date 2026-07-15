from drf_yasg.utils import swagger_auto_schema
from rest_framework import status, viewsets
from rest_framework.authentication import TokenAuthentication
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.permissions import CanReportMeteringForProject
from api.serializers.metering import (
    MeteringReportResponseSerializer,
    MeteringReportSerializer,
)
from core.metering.report import ingest_metered_usage_report


class MeteringReportViewSet(viewsets.GenericViewSet):
    """Control-plane ingest for append-only metered usage facts."""

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated, CanReportMeteringForProject]
    serializer_class = MeteringReportSerializer

    @swagger_auto_schema(
        methods=["POST"],
        request_body=MeteringReportSerializer,
        responses={
            status.HTTP_201_CREATED: MeteringReportResponseSerializer(),
            status.HTTP_200_OK: MeteringReportResponseSerializer(),
        },
        operation_description=(
            "Append one metered usage fact. Deduplicated by ``idempotency_key``."
        ),
    )
    @action(methods=["POST"], detail=False, url_path="report")
    def report(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = dict(serializer.validated_data)
        project = payload.pop("project_id")
        record, created = ingest_metered_usage_report(project, payload)
        body = {
            "id": record.id,
            "recorded_at": record.recorded_at,
            "duplicate": not created,
            "resource_kind": record.resource_kind,
            "resource_id": record.resource_id,
        }
        return Response(
            body,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )
