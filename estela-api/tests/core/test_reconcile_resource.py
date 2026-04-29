"""Tests for ``core.tasks.reconcile_resource``.

That task is the control-plane hook for bringing a ``Resource`` row in line with
external state (e.g. Kubernetes). The current implementation is a **skeleton**:
it respects ``RESOURCE_RECONCILER_ENABLED``, loads the row when enabled, skips
work for terminal phases, and otherwise returns without mutating the DB. When
real reconciliation ships, the same tests should still guard the kill switch,
terminal short-circuit, and idempotency (safe to run twice for the same row).
"""

from unittest import mock

from django.test import override_settings

from core.models import Resource
from core.tasks import reconcile_resource
from estela_resources import ResourceKind, ResourcePhase
from tests.base import BaseTestCase


class ReconcileResourceTaskTests(BaseTestCase):
    """Behaviour contract for ``reconcile_resource``."""

    @override_settings(RESOURCE_RECONCILER_ENABLED=False)
    @mock.patch("core.models.Resource.objects.get")
    def test_skips_when_disabled_does_not_touch_db(self, mock_get):
        """With the flag off, the task must return immediately and never load the row.

        A phase assertion alone would mirror "enabled + no-op" tests; asserting
        that ``Resource.objects.get`` is never called proves the **settings gate**
        runs first (see ``reconcile_resource`` early return).
        """
        project = self.user.project_set.create(
            name="reconcile test project", through_defaults={"permission": "OWNER"}
        )
        resource = Resource.objects.create(
            project=project,
            kind=ResourceKind.SPIDER_JOB,
            phase=ResourcePhase.PENDING,
        )
        result = reconcile_resource(resource.rid)
        self.assertIsNone(result)
        mock_get.assert_not_called()
        resource.refresh_from_db()
        self.assertEqual(resource.phase, ResourcePhase.PENDING)

    @override_settings(RESOURCE_RECONCILER_ENABLED=True)
    @mock.patch("core.models.Resource.objects.get", wraps=Resource.objects.get)
    def test_noop_when_terminal_loads_once_and_leaves_phase(self, mock_get):
        """Terminal resources are skipped after load; phase must not change."""
        project = self.user.project_set.create(
            name="reconcile terminal project", through_defaults={"permission": "OWNER"}
        )
        resource = Resource.objects.create(
            project=project,
            kind=ResourceKind.SPIDER_JOB,
            phase=ResourcePhase.TERMINATED,
        )
        result = reconcile_resource(resource.rid)
        self.assertIsNone(result)
        mock_get.assert_called_once()
        resource.refresh_from_db()
        self.assertEqual(resource.phase, ResourcePhase.TERMINATED)

    @override_settings(RESOURCE_RECONCILER_ENABLED=True)
    @mock.patch("core.models.Resource.objects.get", wraps=Resource.objects.get)
    def test_idempotent_non_terminal_two_calls_same_outcome(self, mock_get):
        """Calling reconcile twice for the same non-terminal row must be safe.

        Idempotency matters once the task performs side effects (K8s, queues):
        retries or overlapping beats must not corrupt state. Today the body is a
        no-op, but we still require **two** ORM loads and an unchanged phase—if
        the implementation accidentally short-circuited after the first call,
        or skipped the second load, this test would fail once behaviour tightens.
        """
        project = self.user.project_set.create(
            name="reconcile idempotent project", through_defaults={"permission": "OWNER"}
        )
        resource = Resource.objects.create(
            project=project,
            kind=ResourceKind.SPIDER_JOB,
            phase=ResourcePhase.PENDING,
        )
        first = reconcile_resource(resource.rid)
        second = reconcile_resource(resource.rid)
        self.assertIsNone(first)
        self.assertIsNone(second)
        self.assertEqual(
            mock_get.call_count,
            2,
            "each invocation should load the resource; two calls => two gets",
        )
        resource.refresh_from_db()
        self.assertEqual(resource.phase, ResourcePhase.PENDING)

    @override_settings(RESOURCE_RECONCILER_ENABLED=True)
    def test_missing_resource_returns_none(self):
        """No row for ``resource_id`` must not raise; callers treat ``None`` as absent."""
        result = reconcile_resource(999999999)
        self.assertIsNone(result)
