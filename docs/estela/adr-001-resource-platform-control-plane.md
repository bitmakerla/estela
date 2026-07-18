---
layout: page
title: "ADR 001: Resource platform & control plane"
parent: estela
nav_order: 9
---

# ADR 001: Resource platform & control plane

## Status

Accepted (directional). Describes the target architecture for upcoming refactors; implementation follows in separate changes.

## Context

estela orchestrates workloads (e.g. spider jobs, deploys) and will need to support more deployable capabilities over time, with per-project isolation, observable lifecycle, usage-based charging, and safe evolution while production traffic continues.

Today much of the execution path is tied to how and when workloads are created and observed in the runtime (e.g. Kubernetes). We want a model that scales product-wise without forcing every new capability to duplicate ad hoc “talk to the cluster from the API” patterns.

## Decision

We adopt a **control plane / data plane** split with a generic **Resource** abstraction and **asynchronous reconciliation**.

### Control plane vs data plane

- **Control plane:** Product APIs, persistence of intent (what the user or system asked for), authorization, project scoping, lifecycle state suitable for UX and billing hooks, scheduling and admission decisions. It must remain usable even when the execution runtime is slow or unavailable.
- **Data plane:** Actually creating, updating, and tearing down workloads (containers, jobs, cloud APIs, or a minimal local executor). Only **workers / background tasks** should perform these actions, not synchronous HTTP handlers as the primary path.

### Resource (intent and observed state)

A **Resource** is the durable record of something deployable or runnable under a **project**. It carries at least:

- **Desired state / spec** — what should be true (configuration the user or system requested).
- **Observed state** — what workers last learned from the runtime (last sync), including references to external objects (e.g. job name, ARN) where applicable.
- **Lifecycle phase** — user-visible states such as pending, provisioning, running, stopping, terminated, failed (exact enum to be defined in implementation).

**Source of truth:** The control plane database holds **authoritative intent** (desired state and allowed transitions). Workers **report observed state** and drive side effects. If intent and reality diverge, workers **reconcile** toward intent or surface failure in observed state; conflict resolution rules are defined per transition in implementation PRs.

### Reconciliation and idempotency

- **Reconciliation:** Workers read `Resource` (and related rows), compare intent to observed/runtime state, call a pluggable **execution backend**, then update observed state and phase.
- **Idempotency:** Creating or updating the same logical workload twice must not double-spend infrastructure or corrupt billing-relevant facts. Reconcilers use stable identifiers, compare-and-swap on phases, and tolerate retries.

### Local vs production execution

- **Production** may continue to use Kubernetes (or other cloud runtimes) behind a stable **execution backend** interface.
- **Local development** should be able to run the application **without** a Kubernetes cluster by configuring a **local execution backend** (simplest reasonable behavior: minimal or stub executor, or Docker-based execution—concrete behavior is defined in implementation). The application behaves as an app whose execution is selected by configuration, not by hard-coding the cluster into the control plane.

### Strangler pattern and production cutover

Refactors must **not** drop or rewrite in-flight customer work in place.

- **Strangler / dual path:** Existing code paths remain valid for workloads already started. New behavior (resource rows, reconciler-driven create/delete/status) is introduced behind **feature flags** or explicit **per-environment settings**, defaulting to current behavior until validated.
- **Long-running jobs:** Jobs that may run for hours and were started under the legacy path keep using legacy dispatch and status handling until they complete. New jobs created after cutover (or jobs explicitly linked and adopted by the new path per migration rules) use the reconciler model. **Additive** schema changes and **backfill** migrations may link existing in-flight rows to `Resource` without changing how their workload was created, until a controlled cutover says otherwise.

### Consequences

- New capabilities should add **resource kinds** and **reconciler / backend** logic rather than new “direct runtime calls from views” patterns.
- UX for “AWS-like” status comes from **phase and observed fields on `Resource`**, optionally mirrored into legacy models during transition.
- Operational playbooks (flags, order of enablement, rollback) accompany implementation PRs; this ADR does not prescribe tooling details.

## Out of scope for this ADR

Concrete database schemas, Celery task names, feature flag keys, and the exact set of lifecycle phases are left to implementation tasks.
