import hashlib
import secrets

from django.utils import timezone
from rest_framework import authentication, exceptions

from core.models import ApiKey

KEYWORD = "Token"
LAST_USED_RESOLUTION = 300


def generate_key():
    """Returns (plaintext, prefix, hash). The plaintext is shown to the user once."""
    plaintext = ApiKey.KEY_PREFIX + secrets.token_urlsafe(32)
    return plaintext, plaintext[: ApiKey.PREFIX_LENGTH], hash_key(plaintext)


def hash_key(plaintext):
    return hashlib.sha256(plaintext.encode()).hexdigest()


class ApiKeyAuthentication(authentication.BaseAuthentication):
    """Authenticates `Authorization: Token estela_...`.

    Anything that is not an estela key is passed on untouched, so the DRF tokens
    that the web and the CLI use today keep working.
    """

    def authenticate(self, request):
        header = authentication.get_authorization_header(request).split()
        if len(header) != 2 or header[0].decode().lower() != KEYWORD.lower():
            return None

        try:
            plaintext = header[1].decode()
        except UnicodeError:
            return None

        if not plaintext.startswith(ApiKey.KEY_PREFIX):
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
