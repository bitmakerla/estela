import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify"
VERIFY_TIMEOUT = 5

# Google's code for a token that has expired or was already used. Tokens are
# only valid for a couple of minutes, so this is the common failure for a form
# that took a while to fill in, and it deserves its own message.
EXPIRED_TOKEN = "timeout-or-duplicate"
MISSING_TOKEN = "missing-input-response"
UNREACHABLE = "verification-unreachable"
REJECTED = "invalid-input-response"


def captcha_enabled():
    """Whether captcha verification is active for this deployment.

    estela can be self-hosted without a Google account, so the check is opt-in:
    it only runs once a secret key is configured.
    """
    return bool(settings.RECAPTCHA_SECRET_KEY)


def get_client_ip(request):
    """Client address as seen behind an ingress or load balancer.

    REMOTE_ADDR would be the proxy, so the first entry of X-Forwarded-For is
    used when present.
    """
    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR", "")

    if forwarded_for:
        return forwarded_for.split(",")[0].strip()

    return request.META.get("REMOTE_ADDR", "")


def verify_captcha(token, remote_ip=None):
    """Check a reCAPTCHA token with Google.

    Returns None when the check passes, or the reason it failed. Only a positive
    confirmation from Google passes: a missing token, a rejection or a network
    failure all fail, so a deployment that has opted in never silently stops
    verifying.
    """
    if not captcha_enabled():
        return None

    if not token:
        logger.warning("Request received without a captcha token")
        return MISSING_TOKEN

    payload = {"secret": settings.RECAPTCHA_SECRET_KEY, "response": token}

    if remote_ip:
        payload["remoteip"] = remote_ip

    try:
        response = requests.post(VERIFY_URL, data=payload, timeout=VERIFY_TIMEOUT)
        result = response.json()
    except (requests.RequestException, ValueError):
        logger.exception("Could not reach the captcha verification service")
        return UNREACHABLE

    if not result.get("success"):
        error_codes = result.get("error-codes") or []
        logger.warning("Captcha verification rejected | error_codes=%s", error_codes)
        return error_codes[0] if error_codes else REJECTED

    return None
