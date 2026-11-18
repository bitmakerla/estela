"""An API key acts as an Operator only with the operator scope and while its owner still is one, as
the provider said at the last sync (api.operators.sync_operators)."""

from datetime import timedelta
from unittest.mock import MagicMock, patch

import requests
from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from api.authentication import generate_key
from api.operators import sync_operators
from core.models import ApiKey, Project, UserProfile

BITMAKER_ORG = "392804493982434155"
CUSTOMER_ORG = "393976771013247865"
SETTINGS = dict(
    AUTH_MODE="oidc",
    ESTELA_PROJECT_ID="393000000000000001",
    BITMAKER_ORG_ID=BITMAKER_ORG,
    ACCOUNT_REGISTRY_URL="",
    OIDC_ISSUER="https://idp.test",
    ZITADEL_READER_TOKEN="reader-token",
)


def person(username, org=BITMAKER_ORG, *, operator=False, sub=None):
    user = User.objects.create_user(username=username, email=f"{username}@example.com")
    UserProfile.objects.filter(user=user).update(
        idp_org_id=org, is_operator=operator, oidc_sub=sub or f"sub-{username}"
    )
    return User.objects.get(pk=user.pk)


def key_client(user, scopes):
    plaintext, prefix, key_hash = generate_key()
    ApiKey.objects.create(
        user=user, name="cli", scopes=scopes, prefix=prefix, key_hash=key_hash,
        expires_at=timezone.now() + timedelta(days=365),
    )
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Token {plaintext}")
    return client


@override_settings(**SETTINGS)
class OperatorKeyTests(TestCase):
    def setUp(self):
        self.kate = person("kate", operator=True)
        mine = Project.objects.create(name="mine")
        mine.users.add(self.kate, through_defaults={"permission": "OWNER"})
        Project.objects.create(name="a-customers")

    def names(self, client):
        response = client.get("/api/projects", {"page_size": 100})
        self.assertEqual(response.status_code, 200)
        return sorted(p["name"] for p in response.json()["results"])

    def test_the_operator_scope_of_an_operator_sees_every_project(self):
        self.assertEqual(self.names(key_client(self.kate, ["operator"])), ["a-customers", "mine"])

    def test_the_operator_scope_of_someone_no_longer_one_sees_only_their_own(self):
        UserProfile.objects.filter(user=self.kate).update(is_operator=False)
        self.assertEqual(self.names(key_client(self.kate, ["operator"])), ["mine"])

    def test_an_operators_key_without_the_scope_sees_only_their_own(self):
        """Their Airflow key, say: a leak of it must not reach every customer."""
        self.assertEqual(self.names(key_client(self.kate, ["data", "run"])), ["mine"])

    def create(self, user, *, operator):
        user.estela_operator = operator  # what the sign-in token said, for this request
        client = APIClient()
        client.force_authenticate(user=user)
        return client.post("/api/account/api-keys", {"name": "cli", "scopes": ["operator"]}, format="json")

    def test_only_an_operator_may_give_a_key_the_operator_scope(self):
        self.assertEqual(self.create(person("customer", CUSTOMER_ORG), operator=False).status_code, 403)
        self.assertEqual(self.create(self.kate, operator=True).status_code, 201)


def zitadel(grants, active, *, fail=False):
    """requests.post as Zitadel's two searches answer it."""

    def post(url, **kwargs):
        if fail:
            raise requests.ConnectionError("down")
        results = grants if url.endswith("users/grants/_search") else active
        response = MagicMock()
        response.json.return_value = {"details": {"totalResult": str(len(results))}, "result": results}
        return response

    return patch("api.operators.requests.post", side_effect=post)


def grant(sub, org=BITMAKER_ORG, state="USER_GRANT_STATE_ACTIVE"):
    return {"userId": sub, "orgId": org, "state": state, "roleKeys": ["estela.operator"]}


@override_settings(**SETTINGS)
class SyncOperatorsTests(TestCase):
    def setUp(self):
        self.kate = person("kate")                          # granted: becomes one
        self.left = person("left", operator=True)           # role taken away: stops being one
        self.gone = person("gone", operator=True)           # deactivated, grant still there
        self.outsider = person("outsider", CUSTOMER_ORG)    # granted, but not of Bitmaker's Org

    def operators(self):
        return sorted(UserProfile.objects.filter(is_operator=True).values_list("user__username", flat=True))

    def test_copies_who_is_an_operator(self):
        grants = [grant("sub-kate"), grant("sub-gone"), grant("sub-outsider")]
        with zitadel(grants, [{"id": "sub-kate"}, {"id": "sub-left"}, {"id": "sub-outsider"}]):
            sync_operators()
        self.assertEqual(self.operators(), ["kate"])

    def test_an_answer_it_cannot_trust_changes_nothing(self):
        for answer in (
            zitadel([], [{"id": "sub-kate"}]),  # nobody named
            zitadel([grant("sub-nobody")], [{"id": "sub-nobody"}]),  # named, but no account here
            zitadel([grant("sub-kate")], [], fail=True),  # unreachable
        ):
            with answer:
                sync_operators()
            self.assertEqual(self.operators(), ["gone", "left"])

    @override_settings(ZITADEL_READER_TOKEN="")
    def test_without_a_token_it_does_nothing(self):
        with zitadel([grant("sub-kate")], [{"id": "sub-kate"}]) as post:
            sync_operators()
        post.assert_not_called()
