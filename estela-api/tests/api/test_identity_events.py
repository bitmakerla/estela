"""The provider's identity events: only signed ones count, and each one does its one thing."""

import hashlib
import hmac
import json
import time

from django.contrib.auth.models import User
from django.test import override_settings
from rest_framework.test import APITestCase

KEY = "signing-key"


def signed(payload, key=KEY, at=None):
    body = json.dumps(payload).encode()
    t = str(int(at or time.time()))
    sig = hmac.new(key.encode(), t.encode() + b"." + body, hashlib.sha256).hexdigest()
    return body, f"t={t},v1={sig}"


@override_settings(IDENTITY_EVENTS_SIGNING_KEY=KEY)
class IdentityEventsTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="ada")
        self.user.profile.oidc_sub = "sub-1"
        self.user.profile.save()

    def send(self, event_type, key=KEY, at=None):
        body, signature = signed({"event_type": event_type, "aggregateID": "sub-1"}, key, at)
        return self.client.post(
            "/api/identity/events", body, content_type="application/json",
            HTTP_ZITADEL_SIGNATURE=signature,
        )

    def test_unsigned_or_stale_events_do_nothing(self):
        self.assertEqual(self.send("user.deactivated", key="wrong").status_code, 401)
        self.assertEqual(self.send("user.deactivated", at=time.time() - 3600).status_code, 401)
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_active)

    def test_password_change_ends_earlier_sign_ins(self):
        self.assertEqual(self.send("user.human.password.changed").status_code, 204)
        self.user.profile.refresh_from_db()
        self.assertIsNotNone(self.user.profile.sessions_valid_after)

    def test_deactivate_then_reactivate(self):
        self.send("user.deactivated")
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_active)
        self.send("user.reactivated")
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_active)
