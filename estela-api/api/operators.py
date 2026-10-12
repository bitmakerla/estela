"""Who is an Operator: Bitmaker staff, who may see every Project, create one for a customer's Org,
and work inside it (ADR 0018 in bitmaker-cloud-openmeter, omx-8q5.4.17).

Signed in through the identity provider (AUTH_MODE=oidc, with ESTELA_PROJECT_ID and
BITMAKER_ORG_ID set), an Operator is a User of Bitmaker's own Org holding the estela.operator role
granted in that Org, as the token of the request says (api.auth.oidc.operator_in). Django's
is_staff no longer counts, and neither does a request made with an API key: only a person signed
in now, so a role taken away stops counting at their next request.

Otherwise (AUTH_MODE=local, or the provider's ids not set yet), an Operator is Django staff, as
before.

Django superusers keep the few powers that were theirs alone (the platform's own admin, not an
Operator's): the checks on is_superuser alone are not Operator checks.
"""

from django.conf import settings


def operators_from_idp():
    return settings.AUTH_MODE == "oidc" and bool(
        settings.ESTELA_PROJECT_ID and settings.BITMAKER_ORG_ID
    )


def is_operator(user):
    """Whether the User making this request is an Operator."""
    if operators_from_idp():
        return bool(getattr(user, "estela_operator", False))
    return bool(user.is_superuser or user.is_staff)


def was_operator(user):
    """Whether another User was an Operator when last seen: for what may be granted to them, never
    for what they may do."""
    if operators_from_idp():
        profile = getattr(user, "profile", None)
        return bool(getattr(profile, "is_operator", False))
    return bool(user.is_superuser or user.is_staff)
