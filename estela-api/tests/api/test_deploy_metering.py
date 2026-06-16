from datetime import datetime, timedelta, timezone as dt_timezone
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase

from api.serializers.deploy import DeployUpdateSerializer
from core.metering.metrics import METRIC_BUILD_DURATION_SECONDS, RESOURCE_KIND_BUILD_JOB
from core.models import Deploy, MeteredUsageRecord, Project


class DeployUpdateMeteringTests(TestCase):
    def setUp(self):
        self.project = Project.objects.create(name="deploy-update-meter")
        self.user = User.objects.create_user(username="deploy-update-user")
        started = datetime(2026, 6, 5, 9, 0, 0, tzinfo=dt_timezone.utc)
        self.deploy = Deploy.objects.create(
            project=self.project,
            user=self.user,
            status=Deploy.BUILDING_STATUS,
        )
        Deploy.objects.filter(pk=self.deploy.pk).update(created=started)

    @patch(
        "core.metering.build.timezone.now",
        return_value=datetime(2026, 6, 5, 9, 1, 30, tzinfo=dt_timezone.utc),
    )
    def test_success_status_update_emits_build_close(self, _mock_now):
        serializer = DeployUpdateSerializer(
            self.deploy,
            data={"status": Deploy.SUCCESS_STATUS, "spiders_names": ["retailer"]},
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()

        row = MeteredUsageRecord.objects.get(
            resource_kind=RESOURCE_KIND_BUILD_JOB,
            resource_id=str(self.deploy.did),
        )
        self.assertEqual(row.kind, MeteredUsageRecord.Kind.JOB_CLOSE)
        self.assertEqual(row.metrics[METRIC_BUILD_DURATION_SECONDS], "90")

    @patch(
        "core.metering.build.timezone.now",
        return_value=datetime(2026, 6, 5, 9, 0, 45, tzinfo=dt_timezone.utc),
    )
    def test_failure_status_update_emits_build_close(self, _mock_now):
        serializer = DeployUpdateSerializer(
            self.deploy,
            data={"status": Deploy.FAILURE_STATUS},
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()

        self.assertTrue(
            MeteredUsageRecord.objects.filter(
                resource_kind=RESOURCE_KIND_BUILD_JOB,
                resource_id=str(self.deploy.did),
            ).exists()
        )
