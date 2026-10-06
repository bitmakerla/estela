"""Sign-in through an OpenID Connect provider (AUTH_MODE=oidc).

A gateway in front of estela (oauth2-proxy, for one) signs people in with the provider
and forwards the provider's ID token as `Authorization: Bearer` on every request. This
checks that token with standard OIDC only: the provider's public keys, found through its
discovery document, and the token's iss, aud, exp and sub. So it works with any
provider.

An account is found by the token's `sub` (UserProfile.oidc_sub), and created the first
time someone signs in. Existing accounts are linked ahead of time by setting their
oidc_sub.
"""

import functools
import re

import jwt
import requests
from django.conf import settings
from django.contrib.auth.models import User
from django.db import IntegrityError, transaction
from rest_framework import authentication, exceptions
from rest_framework.permissions import SAFE_METHODS

from core.models import UserProfile


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
    sub = claims["sub"]
    profile = UserProfile.objects.select_related("user").filter(oidc_sub=sub).first()
    if profile:
        return profile.user
    try:
        with transaction.atomic():
            user = User.objects.create_user(
                username=free_username(claims), email=claims.get("email", "")
            )
            UserProfile.objects.filter(user=user).update(oidc_sub=sub)
            return user
    except IntegrityError:
        # A page fires several requests at once, so a first sign-in races itself. The
        # one that lost finds the account the winner just made.
        profile = (
            UserProfile.objects.select_related("user").filter(oidc_sub=sub).first()
        )
        if profile is None:
            raise exceptions.AuthenticationFailed(
                "Could not set up your account, retry."
            )
        return profile.user


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
