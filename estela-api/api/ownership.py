"""Who owns a new Project, and so who pays for its usage (ADR 0005, amended by ADR 0018, in
bitmaker-cloud-openmeter; omx-8q5.4.15).

A Project is owned by exactly one Org, fixed at creation and never moved, and stores that Org's
billing account (acct_). A customer's User creates Projects in their own Org, the one their
sign-in recorded (UserProfile.idp_org_id). An Operator may also create one owned by a customer
Org, picked from the Account Registry's onboarded Orgs.

Only when the Account Registry is configured: without it (local development, or an estela with no
billing), Projects are created as before, with no owner, and emit no usage.
"""

import logging

from django.conf import settings
from rest_framework import exceptions, status

from core.metering.billing import list_accounts, resolve_billing_account

logger = logging.getLogger(__name__)

# The Billing states of an onboarded Org (ADR 0016). A Stopped one gets no new Projects.
MAY_OWN_NEW_PROJECTS = ["awaiting_card", "active", "internal"]


class BillingUnavailable(exceptions.APIException):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = "Billing cannot be reached to set the Project's owner. Try again shortly."
    default_code = "billing_unavailable"


def owners_required():
    return bool(settings.ACCOUNT_REGISTRY_URL)


def is_operator(user):
    """Bitmaker staff. omx-8q5.4.17 replaces this with the estela.operator role, granted in
    Bitmaker's own Org; until then, staff as estela has always known them."""
    return user.is_superuser or user.is_staff


def own_org(user):
    profile = getattr(user, "profile", None)
    return getattr(profile, "idp_org_id", None)


def onboarded_orgs():
    """The Orgs an Operator may create a Project for."""
    try:
        return list_accounts(MAY_OWN_NEW_PROJECTS)
    except Exception as exc:
        logger.warning("Account Registry: no list of onboarded Orgs: %s", exc)
        raise BillingUnavailable()


def owner_for_new_project(user, requested_org_id=None):
    """``(owner_org_id, billing_account_id)`` for a Project ``user`` is creating, or refuses.

    Nothing is created when this refuses, so a Project never exists without its owner: a job with
    no owner would not start, and usage under the wrong one cannot be moved (ADR 0005)."""
    mine = own_org(user)
    if requested_org_id and requested_org_id != mine:
        if not is_operator(user):
            raise exceptions.PermissionDenied(
                {"owner_org_id": "You can create Projects only in your own Org."}
            )
        account = next(
            (a for a in onboarded_orgs() if a["zitadel_org_id"] == requested_org_id),
            None,
        )
        if account is None:
            raise exceptions.ValidationError(
                {"owner_org_id": "Not an onboarded Org. Onboard it in the Billing Console first."}
            )
        return requested_org_id, account["billing_account_id"]

    if not mine:
        raise exceptions.ValidationError(
            {"owner_org_id": "Your account has no Org yet. Sign in through single sign-on and try again."}
        )
    try:
        return mine, resolve_billing_account(mine)
    except Exception as exc:
        logger.warning("Account Registry: no acct_ for Org %s: %s", mine, exc)
        raise BillingUnavailable()
