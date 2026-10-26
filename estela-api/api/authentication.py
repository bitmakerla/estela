import hashlib
import secrets

from django.conf import settings
from django.utils import timezone
from rest_framework import authentication, exceptions

from core.models import ApiKey, RunToken

KEYWORD = "Token"
LAST_USED_RESOLUTION = 300


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


# How a person is recognised: their sign-in. With AUTH_MODE=local, the DRF token the login hands
# out; with AUTH_MODE=oidc, the provider's token the gateway forwards (api/auth/oidc.py) first.
# DRF's token stays in oidc mode too, for the programs and runs that still hold one.
SIGN_IN_CLASSES = [authentication.TokenAuthentication]
# Every other endpoint also takes an API key.
AUTHENTICATION_CLASSES = [ApiKeyAuthentication, authentication.TokenAuthentication]
# The job and deploy endpoints, which a run's container also reports to. RunToken goes before
# DRF's class, which would otherwise reject its `Token estela-run_...` as an unknown token.
RUN_AUTHENTICATION_CLASSES = [
    ApiKeyAuthentication,
    RunTokenAuthentication,
    authentication.TokenAuthentication,
]

if settings.AUTH_MODE == "oidc":
    from api.auth.oidc import OIDCAuthentication

    for classes in (
        SIGN_IN_CLASSES,
        AUTHENTICATION_CLASSES,
        RUN_AUTHENTICATION_CLASSES,
    ):
        classes.insert(0, OIDCAuthentication)
