"""The gateway's token: what estela accepts, what it refuses, and which account it lands on."""

import time
from datetime import datetime, timezone
from unittest import mock

import jwt
from cryptography.hazmat.primitives.asymmetric import rsa
from django.contrib.auth.models import User
from django.test import override_settings
from rest_framework.test import APITestCase

from api import authentication

ISSUER = "http://issuer.test"
AUDIENCE = "gateway-client"
KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)
OTHER_KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)


def token(key=KEY, **overrides):
    now = int(time.time())
    claims = {
        "iss": ISSUER,
        "aud": [AUDIENCE, "project-id"],
        "sub": "sub-1",
        "iat": now,
        "exp": now + 300,
        "email": "ada@example.com",
        "email_verified": True,
        "preferred_username": "ada",
    }
    claims.update(overrides)
    return jwt.encode(claims, key, algorithm="RS256")


@override_settings(OIDC_ISSUER=ISSUER, OIDC_AUDIENCE=AUDIENCE)
class GatewayAuthTest(APITestCase):
    def setUp(self):
        signing_key = mock.Mock(key=KEY.public_key())
        patcher = mock.patch.object(
            authentication,
            "jwks_client",
            return_value=mock.Mock(get_signing_key_from_jwt=lambda _: signing_key),
        )
        patcher.start()
        self.addCleanup(patcher.stop)

    def whoami(self, bearer):
        return self.client.get("/api/auth/whoami", HTTP_AUTHORIZATION=f"Bearer {bearer}")

    def test_valid_token_creates_the_account_once(self):
        first = self.whoami(token())
        second = self.whoami(token())
        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.json()["username"], "ada")
        self.assertEqual(User.objects.filter(profile__oidc_sub="sub-1").count(), 1)

    def test_refused_tokens(self):
        now = int(time.time())
        cases = {
            "signed by someone else": token(key=OTHER_KEY),
            "another issuer": token(iss="http://evil.test"),
            "issued for another app": token(aud="other-client"),
            "expired": token(iat=now - 900, exp=now - 600),
            "no subject": token(sub=None),
        }
        for name, bearer in cases.items():
            with self.subTest(name):
                self.assertEqual(self.whoami(bearer).status_code, 401)

    def test_links_an_existing_account_by_verified_email(self):
        existing = User.objects.create_user(username="ada-old", email="Ada@Example.com")
        self.assertEqual(self.whoami(token()).json()["username"], "ada-old")
        existing.profile.refresh_from_db()
        self.assertEqual(existing.profile.oidc_sub, "sub-1")

    def test_unverified_email_never_links(self):
        User.objects.create_user(username="victim", email="ada@example.com")
        response = self.whoami(token(email_verified=False))
        self.assertNotEqual(response.json()["username"], "victim")

    def test_inactive_account_is_refused(self):
        self.whoami(token())
        User.objects.filter(profile__oidc_sub="sub-1").update(is_active=False)
        self.assertEqual(self.whoami(token()).status_code, 401)

    def test_sign_in_from_before_a_password_change_is_refused(self):
        self.whoami(token())
        now = int(time.time())
        profile = User.objects.get(profile__oidc_sub="sub-1").profile
        profile.sessions_valid_after = datetime.fromtimestamp(now, tz=timezone.utc)
        profile.save()
        refused = self.whoami(token(auth_time=now - 60))
        self.assertEqual(refused.status_code, 401)
        self.assertEqual(refused.json()["code"], "reauthenticate")
        self.assertEqual(self.whoami(token(auth_time=now + 1)).status_code, 200)

    def test_writes_from_another_site_are_refused(self):
        bearer = f"Bearer {token()}"
        refused = self.client.post(
            "/api/projects", HTTP_AUTHORIZATION=bearer, HTTP_SEC_FETCH_SITE="same-site"
        )
        self.assertEqual(refused.status_code, 403)
        read = self.client.get(
            "/api/auth/whoami", HTTP_AUTHORIZATION=bearer, HTTP_SEC_FETCH_SITE="same-site"
        )
        self.assertEqual(read.status_code, 200)
