"""Where the identity provider tells estela that something happened to a person.

The provider does not revoke refresh tokens when a password changes (zitadel#8288), and the
gateway cannot find a person's sessions to delete them, so estela has to act on its own:

  password changed          sign-ins from before now are refused (auth_time check)
  deactivated/locked/removed  the account stops working, API keys included
  reactivated/unlocked      it works again

This does not go through the gateway, so the signature is the only thing standing between it
and anyone who can reach it: no valid signature, no effect.
"""

import hashlib
import hmac
import json
import time

from django.conf import settings
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import UserProfile

# The provider's own window for its signatures: older ones are replays.
SIGNATURE_TOLERANCE = 300


def signature_is_valid(body, header, key):
    """Zitadel signs `<timestamp>.<body>` with HMAC-SHA256: `t=<ts>,v1=<hex>[,v1=<hex>]`."""
    pairs = [part.split("=", 1) for part in header.split(",") if "=" in part]
    timestamps = [v for k, v in pairs if k == "t"]
    signatures = [v for k, v in pairs if k == "v1"]
    if not key or len(timestamps) != 1 or not timestamps[0].isdigit() or not signatures:
        return False
    if abs(time.time() - int(timestamps[0])) > SIGNATURE_TOLERANCE:
        return False
    expected = hmac.new(
        key.encode(), timestamps[0].encode() + b"." + body, hashlib.sha256
    ).hexdigest()
    return any(hmac.compare_digest(expected, s) for s in signatures)


class IdentityEventsView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        body = request.body  # read before request.data, which would consume it
        if not signature_is_valid(
            body,
            request.headers.get("ZITADEL-Signature", ""),
            settings.IDENTITY_EVENTS_SIGNING_KEY,
        ):
            return Response(status=status.HTTP_401_UNAUTHORIZED)

        event = json.loads(body)
        kind = event.get("event_type", "")
        profile = (
            UserProfile.objects.select_related("user")
            .filter(oidc_sub=event.get("aggregateID"))
            .first()
        )
        if profile is None:
            # Someone who never used estela: nothing here to change.
            return Response(status=status.HTTP_204_NO_CONTENT)

        user = profile.user
        if kind == "user.human.password.changed":
            profile.sessions_valid_after = (
                parse_datetime(event.get("created_at") or "") or timezone.now()
            )
            profile.save(update_fields=["sessions_valid_after"])
        elif kind in ("user.deactivated", "user.locked", "user.removed"):
            user.is_active = False
            user.save(update_fields=["is_active"])
        elif kind in ("user.reactivated", "user.unlocked"):
            user.is_active = True
            user.save(update_fields=["is_active"])
        return Response(status=status.HTTP_204_NO_CONTENT)
