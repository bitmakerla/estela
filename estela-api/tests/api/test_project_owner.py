"""A Project's owner Org is set at creation and stores its acct_ (ADR 0005 and 0018 in
bitmaker-cloud-openmeter, omx-8q5.4.15): a customer's User in their own Org, an Operator also in an
onboarded customer Org. A Project is never created without its owner, and the owner never moves."""

from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import override_settings

from core.models import Activity, Project, UserProfile
from tests.base import BaseTestCase

ACCT = "acct_01M49METSE3G6RCK09PZTEN9VB"
CUSTOMER_ACCT = "acct_01M4J7DSWSQ0C678WDJYS0NFR4"
BITMAKER_ORG = "392804493982434155"
CUSTOMER_ORG = "393976771013247865"
ONBOARDED = [
    {"billing_account_id": CUSTOMER_ACCT, "zitadel_org_id": CUSTOMER_ORG,
     "name": "Billing Test Co.", "billing_state": "active"},
]


def with_org(user, org_id):
    UserProfile.objects.filter(user=user).update(idp_org_id=org_id)
    user.refresh_from_db()
    return user


@override_settings(ACCOUNT_REGISTRY_URL="http://registry.test", ACCOUNT_REGISTRY_TOKEN="t")
class ProjectOwnerTests(BaseTestCase):
    resource = "project-list"

    def setUp(self):
        super().setUp()
        with_org(self.user, CUSTOMER_ORG)
        self.operator = with_org(
            User.objects.create_user(username="operator", is_staff=True), BITMAKER_ORG
        )

    def create(self, user, status_code=201, **data):
        return self.make_request(
            method="POST", user=user, data={"name": "p", **data}, status_code=status_code
        )

    @patch("api.ownership.resolve_billing_account", return_value=CUSTOMER_ACCT)
    def test_a_customers_project_is_owned_by_their_own_org(self, resolve):
        body = self.create(self.user)
        project = Project.objects.get(pid=body["pid"])
        self.assertEqual((project.owner_org_id, project.billing_account_id), (CUSTOMER_ORG, CUSTOMER_ACCT))
        self.assertEqual((body["owner_org_id"], body["billing_account_id"]), (CUSTOMER_ORG, CUSTOMER_ACCT))
        resolve.assert_called_once_with(CUSTOMER_ORG)

    @patch("api.ownership.resolve_billing_account", return_value=CUSTOMER_ACCT)
    def test_naming_their_own_org_is_the_same(self, resolve):
        body = self.create(self.user, owner_org_id=CUSTOMER_ORG)
        self.assertEqual(Project.objects.get(pid=body["pid"]).owner_org_id, CUSTOMER_ORG)

    @patch("api.ownership.list_accounts", return_value=ONBOARDED)
    @patch("api.ownership.resolve_billing_account")
    def test_a_customer_cannot_create_a_project_in_another_org(self, resolve, accounts):
        self.create(self.user, status_code=403, owner_org_id="another-org")
        self.assertFalse(Project.objects.exists())
        resolve.assert_not_called()
        accounts.assert_not_called()

    @patch("api.ownership.resolve_billing_account")
    def test_an_account_with_no_org_creates_nothing(self, resolve):
        with_org(self.user, None)
        body = self.create(self.user, status_code=400)
        self.assertIn("owner_org_id", body)
        self.assertFalse(Project.objects.exists())

    @patch("api.ownership.resolve_billing_account", side_effect=ConnectionError("registry down"))
    def test_a_registry_that_cannot_answer_creates_nothing(self, resolve):
        """ADR 0005: refusing up front loses nothing; a Project with no acct_ would bill nobody."""
        self.create(self.user, status_code=503)
        self.assertFalse(Project.objects.exists())

    @patch("api.ownership.list_accounts", return_value=ONBOARDED)
    @patch("api.ownership.resolve_billing_account")
    def test_an_operator_creates_a_project_for_an_onboarded_org(self, resolve, accounts):
        body = self.create(self.operator, owner_org_id=CUSTOMER_ORG)
        project = Project.objects.get(pid=body["pid"])
        self.assertEqual((project.owner_org_id, project.billing_account_id), (CUSTOMER_ORG, CUSTOMER_ACCT))
        resolve.assert_not_called()   # the acct_ comes with the list: nothing is minted
        accounts.assert_called_once_with(["awaiting_card", "active", "internal"])
        self.assertIn(f"for Org {CUSTOMER_ORG}", Activity.objects.get(project=project).description)

    @patch("api.ownership.list_accounts", return_value=ONBOARDED)
    @patch("api.ownership.resolve_billing_account")
    def test_an_operator_cannot_pick_an_org_that_is_not_onboarded(self, resolve, accounts):
        """Unknown, never onboarded or Stopped: none is in the list."""
        body = self.create(self.operator, status_code=400, owner_org_id="not-onboarded")
        self.assertIn("owner_org_id", body)
        self.assertFalse(Project.objects.exists())
        resolve.assert_not_called()

    @patch("api.ownership.resolve_billing_account", return_value=ACCT)
    def test_an_operator_who_picks_nothing_creates_in_bitmakers_org(self, resolve):
        body = self.create(self.operator)
        self.assertEqual(Project.objects.get(pid=body["pid"]).owner_org_id, BITMAKER_ORG)

    @patch("api.ownership.resolve_billing_account", return_value=CUSTOMER_ACCT)
    def test_the_owner_never_moves(self, resolve):
        pid = self.create(self.user)["pid"]
        self.make_request(
            method="PATCH", resource="project-detail", url_kwargs={"pid": pid}, user=self.user,
            data={"owner_org_id": "another-org", "name": "renamed"},
        )
        project = Project.objects.get(pid=pid)
        self.assertEqual((project.name, project.owner_org_id), ("renamed", CUSTOMER_ORG))

    @patch("api.ownership.list_accounts", return_value=ONBOARDED)
    def test_operators_list_the_orgs_they_may_pick(self, accounts):
        body = self.make_request(method="GET", resource="project-owner-orgs", user=self.operator)
        self.assertEqual(body["results"], [
            {"owner_org_id": CUSTOMER_ORG, "name": "Billing Test Co.", "billing_state": "active"},
        ])
        self.make_request(method="GET", resource="project-owner-orgs", user=self.user, status_code=403)


@override_settings(ACCOUNT_REGISTRY_URL="")
class ProjectWithoutBillingTests(BaseTestCase):
    resource = "project-list"

    @patch("api.ownership.resolve_billing_account")
    def test_without_a_registry_projects_are_created_as_before(self, resolve):
        body = self.make_request(method="POST", user=self.user, data={"name": "p"}, status_code=201)
        project = Project.objects.get(pid=body["pid"])
        self.assertEqual((project.owner_org_id, project.billing_account_id), (None, None))
        resolve.assert_not_called()
