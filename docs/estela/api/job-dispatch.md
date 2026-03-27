---
layout: page
title: Job Dispatch
parent: API
grand_parent: estela
---

# Job Dispatch

estela uses a capacity-aware sequential dispatch system to launch spider jobs.
Instead of creating K8s Jobs immediately when requested, jobs are queued in the
database and dispatched in controlled batches based on available cluster resources.

## run_spider_jobs Task

The Celery Beat scheduler triggers the `run_spider_jobs` task periodically (default
every 30 seconds, configured via `DISPATCH_RETRY_DELAY`).

{: .note }
> estela uses `django-celery-beat` with `DatabaseScheduler`. This means the schedule
> is stored in the database, and **the DB value takes precedence** over what is defined
> in `celery.py`. If you change `DISPATCH_RETRY_DELAY` in settings but the DB already
> has a different interval, the DB value wins. Use the Django admin to update it, or
> delete the `PeriodicTask` entry so it gets recreated from code.

The task follows this sequence:

1. **Acquire Redis lock**: Uses `SET spider_jobs_lock 1 NX EX 120` to prevent
   overlapping executions. If the lock exists (previous run still active), the task
   exits immediately.

2. **Fetch queued jobs**: Queries jobs with `IN_QUEUE` status, ordered by creation
   date (FIFO), limited to `RUN_JOBS_PER_LOT` (default 100, 1000 in production).

3. **Read cluster capacity**: Calls the K8s API to calculate total allocatable
   resources and current usage across worker nodes.

4. **Dispatch loop**: For each queued job, looks up its resource tier, checks if
   dispatching it would exceed the capacity threshold. If capacity is available,
   sets status to `WAITING` and creates the K8s Job. If not, the job is skipped
   and remains `IN_QUEUE` for the next cycle.

5. **Release lock**: The Redis lock is deleted in a `finally` block, ensuring it is
   always released even if an error occurs.

Job status transitions: `IN_QUEUE` → `WAITING` → `RUNNING` → `COMPLETED` / `ERROR`

## Cluster Resource Checking

The `_get_cluster_resources()` function queries the K8s API to determine available
capacity on worker nodes. Nodes are selected by label (`role=<SPIDER_NODE_ROLE>`,
default `bitmaker-worker`).

For each matching node, the function:
- Sums `node.status.allocatable` for CPU and memory (total cluster capacity).
- Sums resource **requests** (not limits) from all Running and Pending pods on that node.
- Also accounts for unscheduled Pending pods that target the same node role via
  `nodeSelector`, since those will consume resources once scheduled.

The `NODE_CAPACITY_THRESHOLD` (default 0.95) defines the maximum allowed utilization.
A job is only dispatched if both CPU and memory usage would remain below this threshold
after adding the job's requests. The 5% headroom is reserved for system pods and
in-flight scheduling.

## Resource Tiers

Each job is assigned a resource tier that determines CPU and memory for its K8s pod.
Tiers are defined in `core/tiers.py`:

| Tier   | CPU Req | CPU Lim | Mem Req  | Mem Lim  |
|--------|---------|---------|----------|----------|
| TINY   | 128m    | 256m    | 96Mi     | 128Mi    |
| XSMALL | 192m    | 384m    | 192Mi    | 256Mi    |
| SMALL  | 256m    | 512m    | 384Mi    | 512Mi    |
| MEDIUM | 256m    | 512m    | 768Mi    | 1Gi      |
| LARGE  | 512m    | 1024m   | 1152Mi   | 1536Mi   |
| XLARGE | 512m    | 1024m   | 1536Mi   | 2Gi      |
| HUGE   | 1024m   | 2048m   | 3072Mi   | 4Gi      |
| XHUGE  | 2048m   | 4096m   | 6144Mi   | 8Gi      |

The default tier is **LARGE**. Memory requests are ~75% of the limit, and CPU limits
are 2x the request.

Each pod receives a `MEMUSAGE_LIMIT_MB` environment variable (~85% of the memory limit).
Scrapy's MemoryUsage extension uses this to shut down gracefully before the container
is OOM-killed by Kubernetes.

## Celery Worker Concurrency

The Celery worker command is defined in the Helm chart (`api-deployment.yaml`). By
default it does not specify `--concurrency`, so Celery uses the number of available
CPUs.

It is recommended to set `--concurrency` to at least 4-8 to ensure the dispatch task
is not starved by other long-running tasks. For example, `delete_expired_jobs_data`
performs MongoDB deletions that can take significant time. If concurrency is too low,
these tasks can occupy all workers and delay job dispatching.

## Key Files

| File | Description |
|------|-------------|
| `core/tasks.py` | `run_spider_jobs`, `_get_cluster_resources()`, `_dispatch_single_job()` |
| `core/tiers.py` | Tier definitions, `TIER_CHOICES`, `get_tier_resources()` |
| `engines/kubernetes.py` | K8s Job creation with tier-based resource allocation |
| `config/celery.py` | Beat schedule and periodic task registration |
| `config/settings/base.py` | `DISPATCH_RETRY_DELAY`, `NODE_CAPACITY_THRESHOLD`, `SPIDER_NODE_ROLE` |
| `installation/helm-chart/templates/API/api-serviceaccount.yaml` | ClusterRole with node/pod permissions |

## Known Issues

- **DatabaseScheduler overrides code defaults**: If you change `DISPATCH_RETRY_DELAY`
  in settings but the periodic task already exists in the DB with the old interval,
  the code change has no effect. Delete the DB entry or update it via Django admin.

- **409 Conflict on retry**: If a job dispatch fails after the K8s Job was already
  created but before the status was updated to `WAITING`, the next dispatch cycle
  will attempt to create the same K8s Job again, resulting in a 409 Conflict from the
  K8s API. The error is caught and logged, but the job remains `IN_QUEUE`.

- **Node selector mismatch**: If `MULTI_NODE_MODE` is enabled but worker nodes don't
  have the expected `role` label (default `bitmaker-worker`), `_get_cluster_resources()`
  returns no nodes and dispatch is blocked. Similarly, spider pods use `nodeSelector`
  with this role, so unlabeled nodes won't run spider jobs.

## Deployment Requirements

- **`MULTI_NODE_MODE` must be `"True"`**: This is **critical**. When `MULTI_NODE_MODE`
  is enabled, spider pods are scheduled with a `nodeSelector` matching `SPIDER_NODE_ROLE`,
  and `_get_cluster_resources()` queries only those labeled nodes. If `MULTI_NODE_MODE`
  is `"False"`, pods have no `nodeSelector` and the capacity check has no way to
  accurately measure available resources. The sequential dispatch system is designed
  to work with `MULTI_NODE_MODE=True`.

- **ClusterRole**: The service account used by the API and Celery worker must have
  `get` and `list` permissions on `nodes` and `pods` resources. Without this,
  `_get_cluster_resources()` fails and no jobs are dispatched. See
  `api-serviceaccount.yaml` for the current ClusterRole definition.

- **Worker concurrency**: Ensure the Celery worker has enough concurrency to handle
  dispatch alongside other periodic tasks. Add `--concurrency=8` (or similar) to the
  worker command in the Helm chart if not already set.

- **Environment variables**: `DISPATCH_RETRY_DELAY`, `NODE_CAPACITY_THRESHOLD`,
  `SPIDER_NODE_ROLE`, and `MULTI_NODE_MODE` must be configured in the API secrets
  or config map.
