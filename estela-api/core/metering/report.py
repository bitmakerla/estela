"""Unified append-only ingest for metered usage (HTTP API and internal writers)."""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional, Tuple

from django.db import IntegrityError, transaction

from core.metering.metrics import REPORTER_ESTELA, prepare_metered_usage_fields
from core.models import MeteredUsageRecord, Project

logger = logging.getLogger(__name__)


def create_metered_usage_idempotent(**fields: Any) -> Optional[MeteredUsageRecord]:
    """Insert one row; on duplicate idempotency_key log and return None."""
    fields = prepare_metered_usage_fields(**fields)
    try:
        with transaction.atomic():
            return MeteredUsageRecord.objects.create(**fields)
    except IntegrityError:
        key = fields.get("idempotency_key")
        logger.info("Skipped duplicate MeteredUsageRecord idempotency_key=%s", key)
        return None


def append_metered_usage(
    *,
    project: Project,
    kind: str,
    metrics: Dict[str, Any],
    interval_start,
    interval_end,
    idempotency_key: str,
    resource_kind: str,
    resource_id: str,
    source_ref: str = "",
    reporter: str = REPORTER_ESTELA,
    adjustment_reason: str = "",
) -> Optional[MeteredUsageRecord]:
    """Metrics-first write path shared by internal jobs and the HTTP ingest API."""
    return create_metered_usage_idempotent(
        project=project,
        resource_kind=resource_kind,
        resource_id=resource_id,
        interval_start=interval_start,
        interval_end=interval_end,
        metrics=metrics,
        kind=kind,
        idempotency_key=idempotency_key,
        source_ref=source_ref,
        reporter=reporter,
        adjustment_reason=adjustment_reason,
    )


def ingest_metered_usage_report(
    project: Project, payload: Dict[str, Any]
) -> Tuple[Optional[MeteredUsageRecord], bool]:
    """Append one ledger row from an HTTP-shaped payload."""
    record = append_metered_usage(
        project=project,
        resource_kind=payload["resource_kind"],
        resource_id=payload["resource_id"],
        interval_start=payload["interval_start"],
        interval_end=payload["interval_end"],
        metrics=payload["metrics"],
        kind=payload["kind"],
        idempotency_key=payload["idempotency_key"],
        source_ref=payload.get("source_ref") or "",
        reporter=payload.get("reporter") or REPORTER_ESTELA,
        adjustment_reason=payload.get("adjustment_reason") or "",
    )
    if record is not None:
        return record, True
    existing = MeteredUsageRecord.objects.filter(
        idempotency_key=payload["idempotency_key"]
    ).first()
    return existing, False
