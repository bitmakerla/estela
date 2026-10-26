"""At sign-in, an account records once the User's own Org and Bitmaker's id for them (usr_, ADR 0017
in bitmaker-cloud-openmeter, omx-8q5.4.14), and neither ever blocks the sign-in."""

from unittest.mock import patch

from django.test import TestCase, override_settings

from api.auth.oidc import account_for
from core.models import UserProfile

ORG_CLAIM = "urn:zitadel:iam:user:resourceowner:id"
ISSUER = "https://auth.hetzner-staging.bitmaker.dev"
USR = "usr_01M4J7DSWSQ0C678WDJYS0NFR4"


def claims(sub="sub-1", org="org-1", **extra):
    base = {"iss": ISSUER, "sub": sub, "preferred_username": f"user-{sub}", "email": f"{sub}@example.com"}
    if org is not None:
        base[ORG_CLAIM] = org
    return {**base, **extra}


@override_settings(ACCOUNT_REGISTRY_URL="http://registry.test", ACCOUNT_REGISTRY_TOKEN="t")
class RecordIdentityTests(TestCase):
    def profile(self, sub="sub-1"):
        return UserProfile.objects.get(oidc_sub=sub)

    @patch("api.auth.oidc.resolve_user_id", return_value=USR)
    def test_a_first_sign_in_records_the_org_and_the_usr(self, resolve):
        account_for(claims())
        profile = self.profile()
        self.assertEqual((profile.idp_org_id, profile.bitmaker_user_id), ("org-1", USR))
        resolve.assert_called_once_with(ISSUER, "sub-1")

    @patch("api.auth.oidc.resolve_user_id", return_value=USR)
    def test_once_known_nothing_is_asked_or_written_again(self, resolve):
        account_for(claims())
        with self.assertNumQueries(1):    # the account lookup, and nothing else
            account_for(claims())
        resolve.assert_called_once()

    @patch("api.auth.oidc.resolve_user_id", side_effect=ConnectionError("registry down"))
    def test_a_registry_that_cannot_answer_does_not_block_the_sign_in(self, resolve):
        user = account_for(claims())
        self.assertTrue(user.is_active)
        profile = self.profile()
        self.assertEqual((profile.idp_org_id, profile.bitmaker_user_id), ("org-1", None))
        # The next request tries again, and records it then.
        resolve.side_effect, resolve.return_value = None, USR
        account_for(claims())
        self.assertEqual(self.profile().bitmaker_user_id, USR)

    @patch("api.auth.oidc.resolve_user_id", return_value=USR)
    def test_the_org_is_set_once_and_never_moved(self, resolve):
        account_for(claims(org="org-1"))
        with self.assertLogs("api.auth.oidc", level="WARNING") as logs:
            account_for(claims(org="org-2"))
        self.assertEqual(self.profile().idp_org_id, "org-1")
        self.assertIn("kept", logs.output[0])

    @patch("api.auth.oidc.resolve_user_id", return_value=USR)
    def test_a_token_without_the_org_claim_leaves_it_unknown(self, resolve):
        account_for(claims(org=None))
        self.assertIsNone(self.profile().idp_org_id)

    @override_settings(OIDC_ORG_CLAIM="org_id")
    @patch("api.auth.oidc.resolve_user_id", return_value=USR)
    def test_the_org_claims_name_is_a_setting(self, resolve):
        """ADR 0017: the provider's claim name lives in one place."""
        account_for(claims(org=None, org_id="org-9"))
        self.assertEqual(self.profile().idp_org_id, "org-9")

    @override_settings(ACCOUNT_REGISTRY_URL="")
    @patch("api.auth.oidc.resolve_user_id")
    def test_without_a_registry_configured_no_usr_is_asked_for(self, resolve):
        account_for(claims())
        resolve.assert_not_called()
        self.assertIsNone(self.profile().bitmaker_user_id)
        self.assertEqual(self.profile().idp_org_id, "org-1")
