"""Canonical metric keys and helpers for MeteredUsageRecord ``metrics`` JSON."""

from __future__ import annotations

from decimal import Decimal
from typing import Any, Dict, Optional

# Well-known flow keys (scrape / control-plane ingest).
METRIC_NETWORK_BYTES = "network_bytes"
METRIC_REQUEST_COUNT = "request_count"
METRIC_ITEM_COUNT = "item_count"
METRIC_STORAGE_BYTES = "storage_bytes"
METRIC_RUNTIME_SECONDS = "runtime_seconds"
# Proxy metering is owned by external services (e.g. bitmaker-proxy).
METRIC_PROXY_BYTES = "proxy_bytes"
METRIC_PROXY_NAME = "proxy_name"

ESTELA_FLOW_METRIC_KEYS = (
    METRIC_NETWORK_BYTES,
    METRIC_REQUEST_COUNT,
    METRIC_ITEM_COUNT,
    METRIC_STORAGE_BYTES,
    METRIC_RUNTIME_SECONDS,
)

METRIC_BUILD_DURATION_SECONDS = "build_duration_seconds"
METRIC_REGISTRY_PUSH_BYTES = "registry_push_bytes"
# Mongo spiderdata retention (project-level stock meter).
METRIC_STORAGE_BYTE_HOURS = "storage_byte_hours"
METRIC_STORAGE_BYTES_START = "storage_bytes_start"
METRIC_STORAGE_BYTES_END = "storage_bytes_end"
METRIC_ITEMS_BYTES = "items_bytes"
METRIC_REQUESTS_BYTES = "requests_bytes"
METRIC_LOGS_BYTES = "logs_bytes"

HOURS_PER_STORAGE_DAY = 24

RESOURCE_KIND_SPIDER_JOB = "SpiderJob"
RESOURCE_KIND_BUILD_JOB = "BuildJob"
RESOURCE_KIND_SPIDER = "Spider"
RESOURCE_KIND_PROJECT_STORAGE = "ProjectStorage"
RESOURCE_KIND_PROJECT = "Project"  # legacy storage rows; use PROJECT_STORAGE for retention

REPORTER_ESTELA = "estela"


def metric_int(metrics: Optional[Dict[str, Any]], key: str, default: int = 0) -> int:
    if not metrics or key not in metrics or metrics[key] is None:
        return default
    return int(metrics[key])


def metric_decimal(
    metrics: Optional[Dict[str, Any]], key: str, default: Optional[Decimal] = None
) -> Decimal:
    if not metrics or key not in metrics or metrics[key] is None:
        return default if default is not None else Decimal("0")
    return Decimal(str(metrics[key]))


def retention_metrics_bytes_end(metrics: Optional[Dict[str, Any]]) -> Optional[int]:
    """End-of-interval stock from project retention ``metrics`` (legacy key fallback)."""
    if not metrics:
        return None
    if metrics.get(METRIC_STORAGE_BYTES_END) is not None:
        return int(metrics[METRIC_STORAGE_BYTES_END])
    if metrics.get(METRIC_STORAGE_BYTES) is not None:
        return int(metrics[METRIC_STORAGE_BYTES])
    return None


def build_storage_retention_metrics(
    *,
    storage_bytes_end: int,
    storage_byte_hours: int,
    storage_bytes_start: Optional[int] = None,
    items_bytes: Optional[int] = None,
    requests_bytes: Optional[int] = None,
    logs_bytes: Optional[int] = None,
) -> Dict[str, Any]:
    """Project spiderdata retention (stock × time, trapezoidal byte-hours)."""
    metrics: Dict[str, Any] = {
        METRIC_STORAGE_BYTES_END: int(storage_bytes_end),
        METRIC_STORAGE_BYTE_HOURS: int(storage_byte_hours),
    }
    if storage_bytes_start is not None:
        metrics[METRIC_STORAGE_BYTES_START] = int(storage_bytes_start)
    if items_bytes is not None:
        metrics[METRIC_ITEMS_BYTES] = int(items_bytes)
    if requests_bytes is not None:
        metrics[METRIC_REQUESTS_BYTES] = int(requests_bytes)
    if logs_bytes is not None:
        metrics[METRIC_LOGS_BYTES] = int(logs_bytes)
    return metrics


def build_build_metrics(
    *,
    build_duration_seconds: Any = None,
    registry_push_bytes: int = 0,
    extra: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Build metrics for a finished image build (BuildJob JOB_CLOSE)."""
    metrics: Dict[str, Any] = {}
    if build_duration_seconds is not None:
        dec = Decimal(str(build_duration_seconds))
        if dec:
            metrics[METRIC_BUILD_DURATION_SECONDS] = str(dec)
    if registry_push_bytes:
        metrics[METRIC_REGISTRY_PUSH_BYTES] = int(registry_push_bytes)
    if extra:
        metrics.update(extra)
    return metrics


def build_flow_metrics(
    *,
    network_bytes: int = 0,
    request_count: int = 0,
    item_count: int = 0,
    storage_bytes: int = 0,
    runtime_seconds: Any = None,
    extra: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Build estela scrape flow metrics (no proxy — see bitmaker-proxy)."""
    metrics: Dict[str, Any] = {
        METRIC_NETWORK_BYTES: int(network_bytes),
        METRIC_REQUEST_COUNT: int(request_count),
        METRIC_ITEM_COUNT: int(item_count),
        METRIC_STORAGE_BYTES: int(storage_bytes),
    }
    if runtime_seconds is not None:
        dec = Decimal(str(runtime_seconds))
        if dec:
            metrics[METRIC_RUNTIME_SECONDS] = str(dec)
    if extra:
        metrics.update(extra)
    return metrics


def sum_estela_flow_metrics(metrics_list) -> Dict[str, Any]:
    """Sum estela-owned flow keys across multiple ``metrics`` dicts."""
    totals = {
        "network": 0,
        "request_count": 0,
        "item_count": 0,
        "runtime_seconds": Decimal("0"),
        "storage_bytes": 0,
    }
    for metrics in metrics_list:
        metrics = metrics or {}
        totals["network"] += metric_int(metrics, METRIC_NETWORK_BYTES)
        totals["request_count"] += metric_int(metrics, METRIC_REQUEST_COUNT)
        totals["item_count"] += metric_int(metrics, METRIC_ITEM_COUNT)
        totals["storage_bytes"] += metric_int(metrics, METRIC_STORAGE_BYTES)
        totals["runtime_seconds"] += metric_decimal(metrics, METRIC_RUNTIME_SECONDS)
    return totals


def prepare_metered_usage_fields(**fields: Any) -> Dict[str, Any]:
    """Normalize write payload: ensure ``metrics`` dict and required attribution."""
    out = dict(fields)
    out["metrics"] = dict(out.pop("metrics", None) or {})
    if not out.get("resource_kind") or not out.get("resource_id"):
        raise ValueError("resource_kind and resource_id are required")
    out.setdefault("reporter", REPORTER_ESTELA)
    return out
