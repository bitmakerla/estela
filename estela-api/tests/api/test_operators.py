"""Operators are the estela.operator role granted in Bitmaker's own Org, read from the token of each
request, not Django staff; and a per-Project role goes only to a User of the Project's Org or to an
Operator (ADR 0018 in bitmaker-cloud-openmeter, omx-8q5.4.17)."""

from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from api.auth.oidc import account_for, operator_in
from api.authentication import issue_run_token
from api.operators import is_operator, was_operator
from core.models import Deploy, Project, UserProfile

ESTELA_PROJECT = "393000000000000001"
BITMAKER_ORG = "392804493982434155"
CUSTOMER_ORG = "393976771013247865"
ROLES_CLAIM = f"urn:zitadel:iam:org:project:{ESTELA_PROJECT}:roles"
ORG_CLAIM = "urn:zitadel:iam:user:resourceowner:id"
OPERATORS = dict(AUTH_MODE="oidc", ESTELA_PROJECT_ID=ESTELA_PROJECT, BITMAKER_ORG_ID=BITMAKER_ORG)


def claims(org=BITMAKER_ORG, granted_in=(BITMAKER_ORG,), role="estela.operator", sub="sub-1"):
    roles = {role: {o: f"{o}.example" for o in granted_in}} if granted_in else {}
    return {"iss": "https://idp.test", "sub": sub, "preferred_username": sub, ORG_CLAIM: org,
            ROLES_CLAIM: roles}


@override_settings(**OPERATORS)
class OperatorInTokenTests(TestCase):
    def test_bitmakers_user_with_the_role_granted_in_bitmakers_org(self):
        self.assertTrue(operator_in(claims()))

    def test_the_role_granted_in_another_org_does_not_count(self):
        """A customer admin who manages their own members cannot make themselves staff."""
        self.assertFalse(operator_in(claims(org=CUSTOMER_ORG, granted_in=(CUSTOMER_ORG,))))
        self.assertFalse(operator_in(claims(org=BITMAKER_ORG, granted_in=(CUSTOMER_ORG,))))

    def test_a_customer_user_granted_it_in_bitmakers_org_does_not_count(self):
        """Zitadel lets a grant cross Orgs (scripts/17): the User's own Org must be Bitmaker's too."""
        self.assertFalse(operator_in(claims(org=CUSTOMER_ORG, granted_in=(BITMAKER_ORG,))))

    def test_other_roles_do_not_count(self):
        self.assertFalse(operator_in(claims(role="estela.viewer")))
        self.assertFalse(operator_in(claims(granted_in=())))

    @override_settings(BITMAKER_ORG_ID="")
    def test_without_bitmakers_org_nobody_is_an_operator_from_the_token(self):
        self.assertFalse(operator_in(claims()))

    @override_settings(OIDC_ROLES_CLAIM="roles_{project_id}")
    def test_the_roles_claims_name_is_a_setting(self):
        token = claims()
        token[f"roles_{ESTELA_PROJECT}"] = token.pop(ROLES_CLAIM)
        self.assertTrue(operator_in(token))


@override_settings(**OPERATORS, ACCOUNT_REGISTRY_URL="")
class OperatorAtSignInTests(TestCase):
    def test_the_request_is_an_operators_and_the_profile_remembers(self):
        user = account_for(claims())
        self.assertTrue(is_operator(user))
        self.assertTrue(UserProfile.objects.get(user=user).is_operator)

    def test_a_role_taken_away_counts_from_the_next_request(self):
        account_for(claims())
        user = account_for(claims(granted_in=()))
        self.assertFalse(is_operator(user))
        self.assertFalse(UserProfile.objects.get(user=user).is_operator)

    def test_unchanged_nothing_is_written(self):
        account_for(claims())
        with self.assertNumQueries(1):
            account_for(claims())

    def test_a_profile_made_by_an_image_without_the_field_reads_as_not_an_operator(self):
        """staging's database is shared with estela images that do not know is_operator: theirs
        leave it NULL, which must read as no, and is set on the User's next sign-in."""
        user = account_for(claims(granted_in=()))
        UserProfile.objects.filter(user=user).update(is_operator=None)
        self.assertFalse(was_operator(User.objects.get(pk=user.pk)))
        account_for(claims(granted_in=()))
        self.assertIs(UserProfile.objects.get(user=user).is_operator, False)

    def test_django_staff_is_not_an_operator(self):
        user = User.objects.create_user(username="staff", is_staff=True, is_superuser=True)
        self.assertFalse(is_operator(user))       # no token in this request says so

    @override_settings(AUTH_MODE="local")
    def test_with_local_sign_in_django_staff_still_are(self):
        self.assertTrue(is_operator(User.objects.create_user(username="staff", is_staff=True)))

    @override_settings(ESTELA_PROJECT_ID="")
    def test_until_the_ids_are_set_django_staff_still_are(self):
        self.assertTrue(is_operator(User.objects.create_user(username="staff", is_staff=True)))


def user_in(org, username, *, operator_seen=False, **kwargs):
    user = User.objects.create_user(username=username, email=f"{username}@example.com", **kwargs)
    UserProfile.objects.filter(user=user).update(idp_org_id=org, is_operator=operator_seen)
    return User.objects.get(pk=user.pk)


@override_settings(**OPERATORS, ACCOUNT_REGISTRY_URL="")
class OperatorPowersTests(TestCase):
    def setUp(self):
        self.customer = user_in(CUSTOMER_ORG, "customer")
        self.owned = Project.objects.create(name="owned", owner_org_id=CUSTOMER_ORG)
        self.owned.users.add(self.customer, through_defaults={"permission": "OWNER"})
        self.other = Project.objects.create(name="someone-elses")

    def client_for(self, user, operator=False):
        user.estela_operator = operator    # what the token said, for this request
        client = APIClient()
        client.force_authenticate(user=user)
        return client

    def names(self, client):
        response = client.get("/api/projects", {"page_size": 100})
        self.assertEqual(response.status_code, 200)
        return sorted(p["name"] for p in response.json()["results"])

    def test_an_operator_sees_every_project(self):
        operator = user_in(BITMAKER_ORG, "op")
        self.assertEqual(self.names(self.client_for(operator, operator=True)), ["owned", "someone-elses"])

    def test_django_staff_without_the_role_sees_only_their_own(self):
        staff = user_in(BITMAKER_ORG, "staff", is_staff=True, is_superuser=True)
        self.assertEqual(self.names(self.client_for(staff)), [])

    def add(self, who, email, project=None):
        project = project or self.owned
        return self.client_for(who).patch(
            f"/api/projects/{project.pid}",
            {"email": email, "action": "add", "permission": "VIEWER"},
            format="json",
        )

    def test_a_role_goes_to_a_user_of_the_projects_org(self):
        colleague = user_in(CUSTOMER_ORG, "colleague")
        self.assertEqual(self.add(self.customer, colleague.email).status_code, 200)
        self.assertTrue(self.owned.users.filter(pk=colleague.pk).exists())

    def test_not_to_a_user_of_another_org(self):
        outsider = user_in("another-org", "outsider")
        response = self.add(self.customer, outsider.email)
        self.assertEqual(response.status_code, 400)
        self.assertIn("Organization", response.json()["email"])
        self.assertFalse(self.owned.users.filter(pk=outsider.pk).exists())

    def test_nor_to_a_user_with_no_org(self):
        self.assertEqual(self.add(self.customer, user_in(None, "legacy").email).status_code, 400)

    def test_but_to_an_operator(self):
        operator = user_in(BITMAKER_ORG, "op", operator_seen=True)
        self.assertEqual(self.add(self.customer, operator.email).status_code, 200)

    def test_bitmakers_users_are_not_operators_by_their_org_alone(self):
        self.assertEqual(self.add(self.customer, user_in(BITMAKER_ORG, "plain").email).status_code, 400)

    def test_a_project_with_no_owner_org_has_no_boundary_yet(self):
        legacy = Project.objects.create(name="legacy")
        legacy.users.add(self.customer, through_defaults={"permission": "OWNER"})
        outsider = user_in("another-org", "outsider")
        self.assertEqual(self.add(self.customer, outsider.email, project=legacy).status_code, 200)


@override_settings(**OPERATORS, ACCOUNT_REGISTRY_URL="")
class DeployReportTests(TestCase):
    """A deploy's build reports its outcome as deploy_manager, holding a run token for that deploy
    alone. deploy_manager is no Operator and no member of the customer's Project: the token is what
    lets it in (deploy 247 on staging, refused when Operators came from the token)."""

    def setUp(self):
        self.deploy_manager = User.objects.create_user(username="deploy_manager", is_staff=True,
                                                       is_superuser=True)
        self.customer = user_in(CUSTOMER_ORG, "customer")
        self.project = Project.objects.create(name="customers", owner_org_id=CUSTOMER_ORG)
        self.project.users.add(self.customer, through_defaults={"permission": "OWNER"})

    def report(self, deploy, token):
        return APIClient().put(f"/api/projects/{self.project.pid}/deploys/{deploy.did}",
                               {"status": Deploy.SUCCESS_STATUS, "spiders_names": ["products"]},
                               format="json", HTTP_AUTHORIZATION=f"Token {token}")

    def building(self):
        return Deploy.objects.create(project=self.project, user=self.customer,
                                     status=Deploy.BUILDING_STATUS)

    def test_the_build_reports_its_own_deploy(self):
        deploy = self.building()
        response = self.report(deploy, issue_run_token(self.deploy_manager, deploy=deploy))
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(Deploy.objects.get(pk=deploy.pk).status, Deploy.SUCCESS_STATUS)

    def test_but_not_another_deploy(self):
        mine, other = self.building(), self.building()
        response = self.report(other, issue_run_token(self.deploy_manager, deploy=mine))
        self.assertEqual(response.status_code, 403)
        self.assertEqual(Deploy.objects.get(pk=other.pk).status, Deploy.BUILDING_STATUS)
