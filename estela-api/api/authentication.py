import functools
import hashlib
import re
import secrets

import jwt
import requests
from django.conf import settings
from django.contrib.auth.models import User
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import authentication, exceptions
from rest_framework.permissions import SAFE_METHODS

from core.models import ApiKey, RunToken, UserProfile

KEYWORD = "Token"
LAST_USED_RESOLUTION = 300
# Seconds of clock disagreement tolerated between the issuer and this server. It also stretches
# how long a leaked token works by the same amount.
CLOCK_LEEWAY = 30


def generate_key():
    """Returns (plaintext, prefix, hash). The plaintext is shown to the user once."""
    plaintext = ApiKey.KEY_PREFIX + secrets.token_urlsafe(32)
    return plaintext, plaintext[: ApiKey.PREFIX_LENGTH], hash_key(plaintext)


def hash_key(plaintext):
    return hashlib.sha256(plaintext.encode()).hexdigest()


def token_with_prefix(request, prefix):
    """The `Authorization: Token <value>` value if it starts with prefix, else None."""
    header = authentication.get_authorization_header(request).split()
    if len(header) != 2 or header[0].decode().lower() != KEYWORD.lower():
        return None
    try:
        plaintext = header[1].decode()
    except UnicodeError:
        return None
    return plaintext if plaintext.startswith(prefix) else None


class ApiKeyAuthentication(authentication.BaseAuthentication):
    """Authenticates `Authorization: Token estela_...`.

    Anything that is not an estela key is passed on untouched, so the DRF tokens
    that the web and the CLI use today keep working.
    """

    def authenticate(self, request):
        plaintext = token_with_prefix(request, ApiKey.KEY_PREFIX)
        if plaintext is None:
            return None

        try:
            api_key = ApiKey.objects.select_related("user").get(
                key_hash=hash_key(plaintext)
            )
        except ApiKey.DoesNotExist:
            raise exceptions.AuthenticationFailed("Invalid API key.")

        if api_key.revoked:
            raise exceptions.AuthenticationFailed("This API key was revoked.")

        if api_key.expired:
            raise exceptions.AuthenticationFailed(
                "This API key expired on {}.".format(
                    api_key.expires_at.date().isoformat()
                )
            )

        if not api_key.user.is_active:
            raise exceptions.AuthenticationFailed("User inactive or deleted.")

        self.touch(api_key)
        return (api_key.user, api_key)

    def touch(self, api_key):
        """Records usage, at most once every LAST_USED_RESOLUTION seconds.

        Airflow polls job status in a loop for hours, so writing on every request
        would be a write per call.
        """
        now = timezone.now()
        if (
            api_key.last_used_at
            and (now - api_key.last_used_at).total_seconds() < LAST_USED_RESOLUTION
        ):
            return
        ApiKey.objects.filter(pk=api_key.pk).update(last_used_at=now)

    def authenticate_header(self, request):
        return KEYWORD


@functools.lru_cache(maxsize=1)
def jwks_client():
    """The issuer's public keys, found through its discovery document.

    Built once per process. PyJWKClient caches the keys and fetches them again when a token
    names one it has not seen, which is what a key rotation looks like from here. A failed
    discovery is not cached, so an issuer that is down at boot is retried on the next request.
    """
    discovery = requests.get(
        f"{settings.OIDC_ISSUER}/.well-known/openid-configuration", timeout=5
    )
    discovery.raise_for_status()
    return jwt.PyJWKClient(discovery.json()["jwks_uri"], lifespan=3600)


def free_username(claims):
    base = claims.get("preferred_username") or claims.get("email", "").split("@")[0]
    base = re.sub(r"[^\w.@+-]", "-", base or claims["sub"])[:140]
    username, n = base, 1
    while User.objects.filter(username=username).exists():
        n += 1
        username = f"{base}-{n}"
    return username


def user_for_claims(claims):
    """The estela account behind a token's subject, linked or created the first time.

    An existing account is linked by email only when the issuer says the email is verified
    and exactly one unlinked account has it. Anything looser would let someone claim another
    person's projects by signing up with their address.
    """
    sub = claims["sub"]
    profile = UserProfile.objects.select_related("user").filter(oidc_sub=sub).first()
    if profile:
        return profile.user

    email = claims.get("email", "")
    user = None
    if email and claims.get("email_verified"):
        matches = list(
            User.objects.filter(email__iexact=email, profile__oidc_sub__isnull=True)[:2]
        )
        user = matches[0] if len(matches) == 1 else None

    try:
        with transaction.atomic():
            if user is None:
                user = User.objects.create_user(username=free_username(claims), email=email)
            UserProfile.objects.filter(user=user).update(oidc_sub=sub)
    except IntegrityError:
        # A page fires several requests at once, so the first sign-in races itself. The one
        # that lost finds the account the winner just made.
        profile = UserProfile.objects.select_related("user").filter(oidc_sub=sub).first()
        if not profile:
            raise exceptions.AuthenticationFailed("Could not set up the account, retry.")
        return profile.user
    return user


class GatewayJWTAuthentication(authentication.BaseAuthentication):
    """Authenticates the `Authorization: Bearer <ID token>` the gateway adds to each request.

    It is the issuer's own token, forwarded untouched, so this checks the issuer's signature,
    that it was issued for this deployment (iss, aud), and that it has not expired. It never
    asks the gateway anything: a request that did not come through it has no valid token.
    """

    def authenticate(self, request):
        header = authentication.get_authorization_header(request).split()
        if len(header) != 2 or header[0].lower() != b"bearer" or not settings.OIDC_ISSUER:
            return None
        # The gateway's cookie is on the parent domain, so a page on any sibling subdomain can
        # make the browser send it along with a form. Browsers say where a request comes from.
        site = request.headers.get("Sec-Fetch-Site", "same-origin")
        if request.method not in SAFE_METHODS and site != "same-origin":
            raise exceptions.PermissionDenied("Requests from other sites cannot change anything.")

        token = header[1].decode(errors="replace")
        try:
            claims = jwt.decode(
                token,
                jwks_client().get_signing_key_from_jwt(token).key,
                algorithms=["RS256"],
                issuer=settings.OIDC_ISSUER,
                audience=settings.OIDC_AUDIENCE,
                leeway=CLOCK_LEEWAY,
                options={"require": ["exp", "iat", "iss", "aud", "sub"]},
            )
        except (jwt.PyJWTError, requests.RequestException):
            raise exceptions.AuthenticationFailed("Invalid or expired token.")

        user = user_for_claims(claims)
        if not user.is_active:
            raise exceptions.AuthenticationFailed("User inactive or deleted.")
        valid_after = user.profile.sessions_valid_after
        if valid_after and claims.get("auth_time", 0) < int(valid_after.timestamp()):
            # The password changed after this sign-in. The web reads the code and signs the
            # person out of the gateway, so the next sign-in is a fresh one.
            raise exceptions.AuthenticationFailed(
                {"detail": "Your password changed. Sign in again.", "code": "reauthenticate"}
            )
        return (user, claims)

    def authenticate_header(self, request):
        return "Bearer"


def issue_run_token(user, job=None, deploy=None):
    """A token for one job's or one deploy's container. Returns the plaintext, which goes
    into the container and is never stored."""
    plaintext = RunToken.KEY_PREFIX + secrets.token_urlsafe(32)
    RunToken.objects.create(key_hash=hash_key(plaintext), user=user, job=job, deploy=deploy)
    return plaintext


class RunTokenAuthentication(authentication.BaseAuthentication):
    """Authenticates `Authorization: Token estela-run_...`, what a job or deploy container
    reports back with. Only the two views a run reports to list it (RUN_AUTHENTICATION_CLASSES);
    anywhere else the token is not recognised at all, and api.permissions.IsOwnRun keeps it
    to its own job or deploy."""

    def authenticate(self, request):
        plaintext = token_with_prefix(request, RunToken.KEY_PREFIX)
        if plaintext is None:
            return None
        run_token = (
            RunToken.objects.select_related("user", "job", "deploy")
            .filter(key_hash=hash_key(plaintext))
            .first()
        )
        if run_token is None or run_token.run_is_over:
            raise exceptions.AuthenticationFailed("This run token is not valid any more.")
        return (run_token.user, run_token)

    def authenticate_header(self, request):
        return KEYWORD


# What every endpoint accepts, in this order. The gateway's token for people, an API key for
# their programs, and the old DRF token only while runs started before RunToken finish; no
# code hands one out any more. The first class also decides the 401 challenge a client sees.
AUTHENTICATION_CLASSES = [
    GatewayJWTAuthentication,
    ApiKeyAuthentication,
    authentication.TokenAuthentication,
]

# The job and deploy endpoints, which a run's container also reports to. RunToken goes before
# DRF's class, which would otherwise reject its `Token estela-run_...` as an unknown token.
RUN_AUTHENTICATION_CLASSES = [
    GatewayJWTAuthentication,
    ApiKeyAuthentication,
    RunTokenAuthentication,
    authentication.TokenAuthentication,
]
