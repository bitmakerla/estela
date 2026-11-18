"""estela login: the key estela hands the CLI works only once its code is approved in the web."""

from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from api.views import apikey


class FakeRedis:
    def __init__(self):
        self.strings = {}

    def get(self, key):
        return self.strings.get(key)

    def set(self, key, value, ex=None, nx=False):
        if nx and key in self.strings:
            return None
        self.strings[key] = value.encode()
        return True

    def delete(self, key):
        return int(self.strings.pop(key, None) is not None)

    def incr(self, key):
        self.strings[key] = self.strings.get(key, 0) + 1
        return self.strings[key]

    def expire(self, key, seconds):
        pass


@override_settings(FRONTEND_HOST="https://cloud.test")
class CliLoginTests(TestCase):
    def setUp(self):
        patcher = patch("api.views.apikey._redis", return_value=FakeRedis())
        patcher.start()
        self.addCleanup(patcher.stop)
        self.erick = User.objects.create_user(username="erick", email="erick@example.com")

    def start(self):
        response = APIClient().post("/api/account/api-keys/cli-login")
        self.assertEqual(response.status_code, 201)
        return response.json()

    def whoami(self, key):
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Token {key}")
        return client.get("/api/auth/whoami")

    def approve(self, code):
        client = APIClient()
        client.force_authenticate(user=self.erick)
        return client.post(
            "/api/account/api-keys",
            {"name": "estela-cli@erick", "scopes": ["data"], "code": code},
            format="json",
        )

    def test_the_key_works_once_its_code_is_approved(self):
        login = self.start()
        self.assertEqual(login["url"], f"https://cloud.test/settings/apiKeys?code={login['code']}")
        self.assertEqual(self.whoami(login["key"]).status_code, 401)

        approved = self.approve(login["code"].lower().replace("-", " "))  # typed by hand
        self.assertEqual(approved.status_code, 201)
        self.assertNotIn("key", approved.json())  # only the CLI ever holds it

        me = self.whoami(login["key"])
        self.assertEqual(me.status_code, 200)
        self.assertEqual((me.json()["username"], me.json()["scopes"]), ("erick", ["data"]))

    def test_a_code_approves_one_key(self):
        code = self.start()["code"]
        self.assertEqual(self.approve(code).status_code, 201)
        self.assertEqual(self.approve(code).status_code, 400)
        self.assertEqual(self.approve("BCDF-GHJK").status_code, 400)

    @patch.object(apikey, "CLI_LOGINS_PER_MINUTE", 2)
    def test_starts_are_capped(self):
        client = APIClient()
        answers = [client.post("/api/account/api-keys/cli-login").status_code for _ in range(3)]
        self.assertEqual(answers, [201, 201, 429])
