from datetime import datetime, timedelta, timezone as dt_timezone
from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase

from core.metering.build import append_metered_usage_for_build_close
from core.metering.metrics import METRIC_BUILD_DURATION_SECONDS, RESOURCE_KIND_BUILD_JOB
from core.models import Deploy, MeteredUsageRecord, Project


class BuildCloseMeteringTests(TestCase):
    def setUp(self):
        self.project = Project.objects.create(name="build-meter-test")
        self.user = User.objects.create_user(username="deploy-tester")
        self.deploy = Deploy.objects.create(
            project=self.project,
            user=self.user,
            status=Deploy.BUILDING_STATUS,
        )

    def _rows_for_deploy(self):
        return MeteredUsageRecord.objects.filter(
            project=self.project,
            resource_kind=RESOURCE_KIND_BUILD_JOB,
            resource_id=str(self.deploy.did),
        )

    def test_build_close_appends_job_close_row(self):
        started = datetime(2026, 6, 5, 10, 0, 0, tzinfo=dt_timezone.utc)
        finished = started + timedelta(seconds=142)
        Deploy.objects.filter(pk=self.deploy.pk).update(created=started)

        append_metered_usage_for_build_close(self.deploy, finished_at=finished)

        row = self._rows_for_deploy().get()
        self.assertEqual(row.kind, MeteredUsageRecord.Kind.JOB_CLOSE)
        self.assertEqual(row.interval_start, started)
        self.assertEqual(row.interval_end, finished)
        self.assertEqual(
            row.metrics[METRIC_BUILD_DURATION_SECONDS],
            str(Decimal("142")),
        )
        self.assertEqual(
            row.idempotency_key, f"estela:BuildJob:{self.deploy.did}:close:v1"
        )

    def test_build_close_is_idempotent(self):
        finished = datetime(2026, 6, 5, 10, 2, 22, tzinfo=dt_timezone.utc)
        append_metered_usage_for_build_close(self.deploy, finished_at=finished)
        append_metered_usage_for_build_close(self.deploy, finished_at=finished)
        self.assertEqual(self._rows_for_deploy().count(), 1)
