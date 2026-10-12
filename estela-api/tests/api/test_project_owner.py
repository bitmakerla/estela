"""A Project's owner Org is set at creation and stores its acct_ (ADR 0005 and 0018 in
bitmaker-cloud-openmeter, omx-8q5.4.15): a customer's User in their own Org, an Operator also in an
onboarded customer Org. A Project is never created without its owner, and the owner never moves."""

from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import override_settings

from core.models import Activity, Permission, Project, UserProfile
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
        self.customer = with_org(
            User.objects.create_user(username="customer", email="owner@customer.example"),
            CUSTOMER_ORG,
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
        body = self.create(self.operator, owner_org_id=CUSTOMER_ORG, owner_email="owner@customer.example")
        project = Project.objects.get(pid=body["pid"])
        self.assertEqual((project.owner_org_id, project.billing_account_id), (CUSTOMER_ORG, CUSTOMER_ACCT))
        resolve.assert_not_called()   # the acct_ comes with the list: nothing is minted
        accounts.assert_called_once_with(["awaiting_card", "active", "internal"])
        self.assertIn(f"for Org {CUSTOMER_ORG}", Activity.objects.get(project=project).description)

    @patch("api.ownership.list_accounts", return_value=ONBOARDED)
    def test_the_named_user_owns_it_and_the_operator_works_in_it_as_admin(self, accounts):
        """The customer sees the Project their Org pays for (staging's billing-test did not)."""
        body = self.create(self.operator, owner_org_id=CUSTOMER_ORG, owner_email="OWNER@customer.example")
        roles = dict(Permission.objects.filter(project_id=body["pid"]).values_list("user__username", "permission"))
        self.assertEqual(roles, {"customer": "OWNER", "operator": "ADMIN"})
        self.assertIn("owned by owner@customer.example", Activity.objects.get(project_id=body["pid"]).description)

    @patch("api.ownership.list_accounts", return_value=ONBOARDED)
    def test_a_project_for_another_org_needs_one_of_its_users_as_owner(self, accounts):
        outsider = with_org(User.objects.create_user(username="outsider", email="x@other.example"), "another-org")
        for email, why in ((None, "Name a User"), (outsider.email, "not in the Organization")):
            with self.subTest(email=email):
                data = {"owner_org_id": CUSTOMER_ORG, **({"owner_email": email} if email else {})}
                body = self.create(self.operator, status_code=400, **data)
                self.assertIn(why, body["owner_email"])
        self.assertFalse(Project.objects.exists())

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
        body = self.create(self.operator, owner_email="owner@customer.example")   # ignored here
        self.assertEqual(Project.objects.get(pid=body["pid"]).owner_org_id, BITMAKER_ORG)
        roles = dict(Permission.objects.filter(project_id=body["pid"]).values_list("user__username", "permission"))
        self.assertEqual(roles, {"operator": "OWNER"})

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


ISSUER = "https://auth.hetzner-staging.bitmaker.dev"


def first_sign_in(email, org=CUSTOMER_ORG, verified=True, sub="sub-new"):
    """What the gate's token brings the first time an invited person signs in."""
    from api.auth.oidc import account_for
    return account_for({"iss": ISSUER, "sub": sub, "preferred_username": email.split("@")[0],
                        "email": email, "email_verified": verified,
                        "urn:zitadel:iam:user:resourceowner:id": org})


@override_settings(ACCOUNT_REGISTRY_URL="http://registry.test", ACCOUNT_REGISTRY_TOKEN="t")
class PendingOwnerTests(BaseTestCase):
    """An Operator sets a customer's Project up before anyone of the customer has signed in
    (option B, omx-8q5.4.27): it is theirs from their first sign-in."""

    resource = "project-list"

    def setUp(self):
        super().setUp()
        for target, value in (("api.auth.oidc.resolve_user_id", "usr_01M4J7DSWSQ0C678WDJYS0NFR4"),
                              ("api.ownership.list_accounts", ONBOARDED)):
            patcher = patch(target, return_value=value)
            patcher.start()
            self.addCleanup(patcher.stop)
        self.operator = with_org(
            User.objects.create_user(username="operator", is_staff=True), BITMAKER_ORG
        )
        self.pid = self.make_request(
            method="POST", user=self.operator, status_code=201,
            data={"name": "managed", "owner_org_id": CUSTOMER_ORG, "owner_email": "New.Owner@customer.example"},
        )["pid"]

    def roles(self):
        return dict(Permission.objects.filter(project_id=self.pid).values_list("user__username", "permission"))

    def test_until_then_the_operator_owns_it_and_it_says_who_will(self):
        project = Project.objects.get(pid=self.pid)
        self.assertEqual(project.pending_owner_email, "new.owner@customer.example")
        self.assertEqual(self.roles(), {"operator": "OWNER"})
        self.assertIn("from their first sign-in", Activity.objects.get(project=project).description)

    def test_at_their_first_sign_in_they_own_it_and_the_operator_is_admin(self):
        user = first_sign_in("new.owner@CUSTOMER.example")
        self.assertEqual(self.roles(), {"operator": "ADMIN", user.username: "OWNER"})
        self.assertIsNone(Project.objects.get(pid=self.pid).pending_owner_email)
        self.assertTrue(Activity.objects.filter(project_id=self.pid, user=user,
                                                description__contains="first sign-in").exists())

    def test_not_from_another_org(self):
        first_sign_in("new.owner@customer.example", org="another-org")
        self.assertEqual(self.roles(), {"operator": "OWNER"})
        self.assertIsNotNone(Project.objects.get(pid=self.pid).pending_owner_email)

    def test_not_with_an_email_the_provider_has_not_verified(self):
        first_sign_in("new.owner@customer.example", verified=False)
        self.assertEqual(self.roles(), {"operator": "OWNER"})

    def test_only_at_the_first_sign_in(self):
        """Later requests pay nothing for it: once the account exists, nothing is looked up."""
        first_sign_in("someone.else@customer.example", sub="sub-other")
        from api.auth.oidc import account_for
        claims = {"iss": ISSUER, "sub": "sub-other", "email": "someone.else@customer.example",
                  "email_verified": True, "urn:zitadel:iam:user:resourceowner:id": CUSTOMER_ORG}
        account_for(claims)  # records its usr_ and Org on the first one
        with self.assertNumQueries(1):
            account_for(claims)
