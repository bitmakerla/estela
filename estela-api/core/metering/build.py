"""BuildJob JOB_CLOSE metering when a deploy finishes."""

from __future__ import annotations

from decimal import Decimal

from django.utils import timezone

from core.metering.metrics import (
    REPORTER_ESTELA,
    RESOURCE_KIND_BUILD_JOB,
    build_build_metrics,
)
from core.metering.report import append_metered_usage
from core.models import Deploy, MeteredUsageRecord

TERMINAL_BUILD_STATUSES = frozenset(
    {
        Deploy.SUCCESS_STATUS,
        Deploy.FAILURE_STATUS,
        Deploy.CANCELED_STATUS,
    }
)


def append_metered_usage_for_build_close(deploy: Deploy, finished_at=None) -> None:
    """Emit one JOB_CLOSE row for a finished build/deploy."""
    finished_at = finished_at or timezone.now()
    started = deploy.created
    if timezone.is_naive(started):
        started = timezone.make_aware(started)
    duration_seconds = max(
        Decimal("0"), Decimal(str((finished_at - started).total_seconds()))
    )

    append_metered_usage(
        idempotency_key=f"estela:BuildJob:{deploy.did}:close:v1",
        project=deploy.project,
        resource_kind=RESOURCE_KIND_BUILD_JOB,
        resource_id=str(deploy.did),
        interval_start=started,
        interval_end=finished_at,
        source_ref=f"deploy:{deploy.did}",
        reporter=REPORTER_ESTELA,
        metrics=build_build_metrics(build_duration_seconds=duration_seconds),
        kind=MeteredUsageRecord.Kind.JOB_CLOSE,
    )
