---
layout: page
title: Job Dispatch
parent: API
grand_parent: estela
---

# Job Dispatch

When a spider job is created in estela, it enters a queue and is dispatched to the
cluster only when sufficient resources are available. This prevents overloading the
cluster and ensures jobs run reliably even under heavy load.

## How Dispatch Works

Jobs are dispatched in periodic cycles (every 30 seconds by default). In each cycle,
estela:

1. Picks up queued jobs in the order they were created (first in, first out).
2. Checks available CPU and memory on the cluster.
3. Dispatches each job only if the cluster has enough capacity without exceeding the
   configured utilization threshold.
4. Leaves jobs in the queue if capacity is not available — they will be retried in the
   next cycle.

Job status transitions: `IN_QUEUE` → `WAITING` → `RUNNING` → `COMPLETED` / `ERROR`

## Resource Tiers

Each job is assigned a resource tier that determines how much CPU and memory its
container receives. The default tier is **LARGE**.

| Tier   | CPU Request | CPU Limit | Memory Request | Memory Limit |
|--------|-------------|-----------|----------------|--------------|
| TINY   | 128m        | 256m      | 96Mi           | 128Mi        |
| XSMALL | 192m        | 384m      | 192Mi          | 256Mi        |
| SMALL  | 256m        | 512m      | 384Mi          | 512Mi        |
| MEDIUM | 256m        | 512m      | 768Mi          | 1Gi          |
| LARGE  | 512m        | 1024m     | 1152Mi         | 1536Mi       |
| XLARGE | 512m        | 1024m     | 1536Mi         | 2Gi          |
| HUGE   | 1024m       | 2048m     | 3072Mi         | 4Gi          |
| XHUGE  | 2048m       | 4096m     | 6144Mi         | 8Gi          |

Each job also receives a memory usage limit (~85% of the memory limit) that allows
spiders to shut down gracefully before being forcefully terminated by the cluster.

## Configuration

The dispatch behavior can be tuned with the following environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `DISPATCH_RETRY_DELAY` | `30` | Seconds between dispatch cycles |
| `WORKERS_CAPACITY_THRESHOLD` | `0.95` | Maximum cluster utilization (0–1) before new jobs are held back |
| `SPIDER_NODE_ROLE` | `bitmaker-worker` | Label used to identify worker nodes |
| `DEDICATED_SPIDER_NODES` | `True` | Whether spider jobs run on dedicated labeled nodes |

{: .note }
> `DISPATCH_RETRY_DELAY` is persisted in the database once initialized. If you update
> it in your settings, you also need to update or delete the corresponding entry via
> the Django admin for the change to take effect.

## Deployment Requirements

- **Dedicated spider nodes**: When `DEDICATED_SPIDER_NODES` is `"True"`, spider jobs
  are scheduled on dedicated nodes identified by the `SPIDER_NODE_ROLE` label, and the
  capacity check only considers those nodes. This is recommended for larger environments
  where you want to isolate spider workloads. For smaller setups, set it to `"False"` to
  allow jobs to run on any available node.

- **Cluster permissions**: The estela API service account must have permission to read
  nodes and pods in the cluster. Without these permissions, the capacity check fails
  and no jobs are dispatched.

- **Worker concurrency**: The background worker should have enough concurrency
  (at least 4–8) to handle job dispatch alongside other periodic tasks. This can be
  configured in the Helm chart.
