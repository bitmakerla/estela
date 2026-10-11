"""Sign-in through an OpenID Connect provider (AUTH_MODE=oidc).

A gateway in front of estela (oauth2-proxy, for one) signs people in with the provider
and forwards the provider's ID token as `Authorization: Bearer` on every request. This
checks that token with standard OIDC only: the provider's public keys, found through its
discovery document, and the token's iss, aud, exp and sub. So it works with any
provider.

An account is found by the token's `sub` (UserProfile.oidc_sub), and created the first
time someone signs in. Existing accounts are linked ahead of time by setting their
oidc_sub.

The account also records, once, the User's own Org (the token's OIDC_ORG_CLAIM) and
Bitmaker's id for them (usr_, from the Account Registry, ADR 0017). Neither ever blocks a
sign-in: a Registry that cannot answer is retried on the next request.
"""

import functools
import logging
import re

import jwt
import requests
from django.conf import settings
from django.contrib.auth.models import User
from django.db import IntegrityError, transaction
from rest_framework import authentication, exceptions
from rest_framework.permissions import SAFE_METHODS

from core.metering.billing import resolve_user_id
from core.models import UserProfile

logger = logging.getLogger(__name__)


@functools.lru_cache(maxsize=1)
def signing_keys():
    """The provider's public keys. Fetched again when a token names a key not seen
    before, which is what a key rotation looks like from here. A failed discovery is not
    cached."""
    discovery = requests.get(
        f"{settings.OIDC_ISSUER}/.well-known/openid-configuration", timeout=5
    )
    discovery.raise_for_status()
    return jwt.PyJWKClient(discovery.json()["jwks_uri"], lifespan=3600)


def free_username(claims):
    name = claims.get("preferred_username") or claims["sub"]
    base = re.sub(r"[^\w.@+-]", "-", name)[:140]
    username, n = base, 1
    while User.objects.filter(username=username).exists():
        n += 1
        username = f"{base}-{n}"
    return username


def account_for(claims):
    """The account of the token's subject, created the first time they sign in."""
    profile = _profile_for(claims)
    record_identity(profile, claims)
    return profile.user


def _profile_for(claims):
    sub = claims["sub"]
    profile = UserProfile.objects.select_related("user").filter(oidc_sub=sub).first()
    if profile:
        return profile
    try:
        with transaction.atomic():
            user = User.objects.create_user(
                username=free_username(claims), email=claims.get("email", "")
            )
            UserProfile.objects.filter(user=user).update(oidc_sub=sub)
    except IntegrityError:
        # A page fires several requests at once, so a first sign-in races itself. The
        # one that lost finds the account the winner just made.
        pass
    profile = UserProfile.objects.select_related("user").filter(oidc_sub=sub).first()
    if profile is None:
        raise exceptions.AuthenticationFailed("Could not set up your account, retry.")
    return profile


def record_identity(profile, claims):
    """Fill in, once, the User's own Org and their usr_. Every request passes here, so it
    writes only what is still missing, and nothing once both are known."""
    changed = []
    org_id = claims.get(settings.OIDC_ORG_CLAIM)
    if org_id and not profile.idp_org_id:
        profile.idp_org_id = org_id
        changed.append("idp_org_id")
    elif org_id and org_id != profile.idp_org_id:
        # A User never moves between Orgs (ADR 0005); keep the first, and say so.
        logger.warning(
            "user %s: token names Org %s, account has %s; kept",
            profile.user_id, org_id, profile.idp_org_id,
        )
    if not profile.bitmaker_user_id and settings.ACCOUNT_REGISTRY_URL:
        try:
            profile.bitmaker_user_id = resolve_user_id(claims["iss"], claims["sub"])
            changed.append("bitmaker_user_id")
        except Exception as exc:  # the sign-in stands; the next request tries again
            logger.warning("user %s: no usr_ from the Account Registry yet: %s", profile.user_id, exc)
    if changed:
        UserProfile.objects.filter(pk=profile.pk).update(
            **{field: getattr(profile, field) for field in changed}
        )


class OIDCAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        header = authentication.get_authorization_header(request).split()
        if len(header) != 2 or header[0].lower() != b"bearer":
            return None
        # The gateway's session cookie lives on the parent domain, so a page on a
        # sibling subdomain can make the browser send it with a form. Browsers say where
        # a request comes from: a change asked for by another site is refused.
        site = request.headers.get("Sec-Fetch-Site", "same-origin")
        if request.method not in SAFE_METHODS and site != "same-origin":
            raise exceptions.PermissionDenied(
                "Requests from other sites cannot change anything."
            )

        token = header[1].decode(errors="replace")
        try:
            claims = jwt.decode(
                token,
                signing_keys().get_signing_key_from_jwt(token).key,
                algorithms=["RS256", "ES256"],
                issuer=settings.OIDC_ISSUER,
                audience=settings.OIDC_AUDIENCE,
                leeway=30,  # seconds of clock drift between provider and server
                options={"require": ["exp", "iss", "aud", "sub"]},
            )
        except (jwt.PyJWTError, requests.RequestException):
            raise exceptions.AuthenticationFailed("Invalid or expired token.")

        user = account_for(claims)
        if not user.is_active:
            raise exceptions.AuthenticationFailed("User inactive or deleted.")
        return (user, claims)

    def authenticate_header(self, request):
        return "Bearer"
