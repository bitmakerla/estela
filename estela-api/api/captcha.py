import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify"
VERIFY_TIMEOUT = 5


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

    Returns True only when Google positively confirms the token. Every other
    outcome -- missing token, rejection, network failure -- counts as a failed
    check, so a deployment that has opted in never silently stops verifying.
    """
    if not captcha_enabled():
        return True

    if not token:
        logger.warning("Request received without a captcha token")
        return False

    payload = {"secret": settings.RECAPTCHA_SECRET_KEY, "response": token}

    if remote_ip:
        payload["remoteip"] = remote_ip

    try:
        response = requests.post(VERIFY_URL, data=payload, timeout=VERIFY_TIMEOUT)
        result = response.json()
    except (requests.RequestException, ValueError):
        logger.exception("Could not reach the captcha verification service")
        return False

    if not result.get("success"):
        logger.warning(
            "Captcha verification rejected | error_codes=%s",
            result.get("error-codes"),
        )
        return False

    return True
