---
layout: page
title: Metering Report
parent: API
grand_parent: estela
---

# Metering report endpoint

Services running in the same cluster can report append-only usage facts to Estela with:

```text
POST /api/v1/metering/report
```

Each successful request writes one `MeteredUsageRecord` row. Estela records the raw usage fact only; wallet balances, invoices, and pricing calculations are handled by downstream billing systems.

## Cluster URL

Inside Kubernetes, call the Django API service by its service DNS name:

```text
http://estela-django-api-service/api/v1/metering/report
```

If your caller runs in another namespace, include the namespace in the service name:

```text
http://estela-django-api-service.<namespace>.svc.cluster.local/api/v1/metering/report
```

For local Skaffold development, use the port-forwarded API URL or the NodePort configured for the web app, for example:

```text
http://localhost:8001/api/v1/metering/report
```

## Authentication and authorization

The endpoint uses Django REST Framework token authentication.

Send the token in the `Authorization` header:

```text
Authorization: Token <token>
```

The token must belong to a user that can access the target `project_id`. Staff and superusers may report usage for any project. Non-staff users may report only for projects they belong to.

## Request body

All timestamps must be parseable ISO 8601 datetimes. Prefer UTC with a `Z` suffix.

| Field | Required | Type | Notes |
|-------|----------|------|-------|
| `project_id` | yes | UUID string | The target `Project.pid`. |
| `resource_kind` | yes | string, max 64 | Generic resource type, for example `SpiderJob`, `BuildJob`, or `ProxySession`. |
| `resource_id` | yes | string, max 512 | Opaque identifier within `resource_kind`. |
| `interval_start` | yes | datetime | Inclusive start of the usage interval. |
| `interval_end` | yes | datetime | Exclusive end of the usage interval. Must be after `interval_start`. |
| `metrics` | yes | object | Non-empty JSON payload with the measured usage values. |
| `idempotency_key` | yes | string, max 512 | Globally unique dedupe key for this usage fact. |
| `kind` | no | string | Defaults to `DELTA_SLICE`. Allowed values are listed below. |
| `source_ref` | no | string, max 512 | Optional cross-system reference. |
| `reporter` | no | string, max 64 | Emitting service name. Defaults to `estela` if omitted or blank. |
| `adjustment_reason` | conditional | string | Required when `kind` is `ADJUSTMENT`. |

Allowed `kind` values:

| Value | Use |
|-------|-----|
| `DELTA_SLICE` | Periodic usage delta for the interval. This is the default for external services. |
| `JOB_CLOSE` | Final job totals recorded at close time. |
| `ADJUSTMENT` | Correction or reconciliation row. Requires `adjustment_reason`. |
| `DATA_DELETE` | Audit marker for usage affected by data deletion. |

Allowed `adjustment_reason` values:

| Value | Use |
|-------|-----|
| `RECONCILE_SCRAPY_FINAL` | Reconcile hourly slices against final Scrapy totals. |
| `RECONCILE_STORAGE` | Reconcile storage totals. |
| `MANUAL` | Manual correction. |

## Metrics payload

`metrics` is intentionally open-ended so services can add new metered dimensions without schema migrations.

Use stable, explicit key names and numeric values when possible. Existing conventions include:

| Metric key | Meaning |
|------------|---------|
| `network_bytes` | Response bytes attributed to a scrape or resource. |
| `request_count` | Number of requests. |
| `item_count` | Number of scraped items. |
| `storage_bytes` | Storage byte delta. |
| `runtime_seconds` | Active runtime seconds. |
| `proxy_bytes` | Proxy response bytes. |
| `proxy_name` | Proxy provider identifier. |
| `build_duration_seconds` | Build duration seconds. |

## Idempotency

`idempotency_key` prevents duplicate rows when callers retry after timeouts or transient errors.

Use a deterministic key that includes the reporter, resource, interval, metric category, and a version. For example:

```text
bitmaker-proxy:SpiderJob:123:proxy:2026-06-05T10:00:00Z:2026-06-05T11:00:00Z:v1
```

If the same key is received again, Estela returns `200 OK` with `"duplicate": true` and does not create another row.

## Example request

```bash
curl -X POST "http://estela-django-api-service/api/v1/metering/report" \
  -H "Authorization: Token ${ESTELA_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "00000000-0000-0000-0000-000000000001",
    "resource_kind": "SpiderJob",
    "resource_id": "123",
    "interval_start": "2026-06-05T10:00:00Z",
    "interval_end": "2026-06-05T11:00:00Z",
    "kind": "DELTA_SLICE",
    "reporter": "bitmaker-proxy",
    "metrics": {
      "proxy_bytes": 5242880,
      "proxy_name": "acme-residential"
    },
    "idempotency_key": "bitmaker-proxy:SpiderJob:123:proxy:2026-06-05T10:00:00Z:2026-06-05T11:00:00Z:v1"
  }'
```

## Responses

New record:

```http
HTTP/1.1 201 Created
Content-Type: application/json
```

```json
{
  "id": "9e7cf4c0-26f5-4c40-9491-e4be87ad8a9f",
  "recorded_at": "2026-06-05T11:00:05.123456Z",
  "duplicate": false,
  "resource_kind": "SpiderJob",
  "resource_id": "123"
}
```

Duplicate retry:

```http
HTTP/1.1 200 OK
Content-Type: application/json
```

```json
{
  "id": "9e7cf4c0-26f5-4c40-9491-e4be87ad8a9f",
  "recorded_at": "2026-06-05T11:00:05.123456Z",
  "duplicate": true,
  "resource_kind": "SpiderJob",
  "resource_id": "123"
}
```

Common error responses:

| Status | Cause |
|--------|-------|
| `400 Bad Request` | Invalid payload, missing metric keys, unknown project, or `interval_end <= interval_start`. |
| `401 Unauthorized` | Missing or invalid token. |
| `403 Forbidden` | Token user cannot access the target project. |

## Implementation notes

The endpoint appends to `core.models.MeteredUsageRecord`. Rows are append-only in normal application flow; corrections should be represented as additional `ADJUSTMENT` rows rather than updates to previous rows. Estela stores raw usage facts; downstream billing systems are responsible for pricing, wallet balance changes, and invoice calculations.
