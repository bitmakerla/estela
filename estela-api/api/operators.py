"""Who is an Operator: Bitmaker staff, who may see every Project, create one for a customer's Org,
and work inside it (ADR 0018 in bitmaker-cloud-openmeter, omx-8q5.4.17).

Signed in through the identity provider (AUTH_MODE=oidc, with ESTELA_PROJECT_ID and
BITMAKER_ORG_ID set), an Operator is a User of Bitmaker's own Org holding the estela.operator role
granted in that Org, as the token of the request says (api.auth.oidc.operator_in), so a role taken
away stops counting at their next request. Django's is_staff no longer counts. A request made with
an API key counts only when the key has the operator scope and its owner still is an Operator, as
the provider said at the last sync (sync_operators, every 15 minutes).

Otherwise (AUTH_MODE=local, or the provider's ids not set yet), an Operator is Django staff, as
before.

Django superusers keep the few powers that were theirs alone (the platform's own admin, not an
Operator's): the checks on is_superuser alone are not Operator checks.
"""

import logging

import requests
from django.conf import settings

from core.models import UserProfile

logger = logging.getLogger(__name__)

# ponytail: one page per search; page through it if Bitmaker's Org ever passes this many Users.
SYNC_PAGE = 1000


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


def sync_operators():
    """Copies who is an Operator from the provider into UserProfile.is_operator, for what is decided
    with no token of theirs at hand: their API keys with the operator scope, a role others grant them,
    the "(admin)" next to their name. The same rule as operator_in: estela.operator granted in
    Bitmaker's Org, to an active User of that Org. Writes nothing when the provider's answer cannot be
    trusted whole, so a failure never takes Operators away."""
    if not (operators_from_idp() and settings.ZITADEL_READER_TOKEN):
        return
    grants = _search_bitmakers_org(
        "users/grants/_search",
        [
            {"projectIdQuery": {"projectId": settings.ESTELA_PROJECT_ID}},
            {"roleKeyQuery": {"roleKey": settings.OPERATOR_ROLE}},
        ],
    )
    # Deactivating someone leaves their grants in place: only an active User counts.
    active = _search_bitmakers_org("users/_search", [{"stateQuery": {"state": "USER_STATE_ACTIVE"}}])
    if grants is None or active is None:
        return
    active_ids = {u["id"] for u in active}
    subs = {
        g["userId"]
        for g in grants
        if g.get("state") == "USER_GRANT_STATE_ACTIVE"
        and g.get("orgId") == settings.BITMAKER_ORG_ID
        and settings.OPERATOR_ROLE in (g.get("roleKeys") or [])
        and g["userId"] in active_ids
    }
    if not subs:
        # A wrong id or header answers 200 with nothing: never read that as "nobody is an Operator".
        logger.warning("operator sync: the provider named no Operator, nothing changed")
        return
    operators = list(
        UserProfile.objects.filter(
            oidc_sub__in=subs, idp_org_id=settings.BITMAKER_ORG_ID
        ).values_list("pk", flat=True)
    )
    if not operators:
        # Operators named that match no account here (another issuer's ids, say): same as above.
        logger.warning("operator sync: no account here matches the provider's Operators, nothing changed")
        return
    UserProfile.objects.filter(pk__in=operators).update(is_operator=True)
    UserProfile.objects.filter(is_operator=True).exclude(pk__in=operators).update(is_operator=False)


def _search_bitmakers_org(path, queries):
    """Every result of one search in Bitmaker's Org at the provider (Zitadel's management API), or
    None when it failed or came back cut short."""
    try:
        response = requests.post(
            f"{settings.OIDC_ISSUER}/management/v1/{path}",
            json={"query": {"limit": SYNC_PAGE}, "queries": queries},
            headers={
                "Authorization": f"Bearer {settings.ZITADEL_READER_TOKEN}",
                "x-zitadel-orgid": settings.BITMAKER_ORG_ID,
            },
            timeout=10,
        )
        response.raise_for_status()
        body = response.json()
    except (requests.RequestException, ValueError) as exc:
        logger.warning("operator sync: %s failed: %s", path, exc)
        return None
    results = body.get("result") or []
    if int((body.get("details") or {}).get("totalResult") or 0) > len(results):
        logger.warning("operator sync: %s returned more than one page, nothing changed", path)
        return None
    return results
