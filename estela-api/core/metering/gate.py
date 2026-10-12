"""The usage gate: a Job starts only for an Org whose billing is set up (ADR 0016 in
bitmaker-cloud-openmeter, omx-8q5.4.16; extends ADR 0005's rule 1).

Before a Job starts, ad hoc or scheduled, its Project's billing account (acct_) is read from the
Account Registry. Only an Org whose Billing state is ``active`` or ``internal`` starts. A Project
with no acct_, an Org never onboarded, one awaiting its card, one out of prepaid credit (ADR 0019)
and a stopped one are refused.
Running Jobs are never re-checked.

Each account's state is cached in Redis, shared by every API and worker process:

- younger than ``USAGE_GATE_FRESH_SECONDS`` (about 2 minutes): used as it is, so a stopped Org
  stops starting Jobs within that;
- when the Registry cannot answer: an account last seen ``active`` or ``internal`` keeps starting
  Jobs for up to ``USAGE_GATE_LAST_KNOWN_GOOD_SECONDS`` (24 hours); any other is refused.

The Registry is only asked here, never in the usage path: events carry the Project's stored acct_.

Off unless ``USAGE_GATE_ENABLED``: turning it on refuses every Project with no acct_ yet.
"""

import json
import logging
import time

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

MAY_START = ("active", "internal")
STATE_KEY = "estela:billing:state:{}"

NO_OWNER = "no_owner"
NOT_SET_UP = "not_set_up"
OUT_OF_CREDIT = "out_of_credit"
STOPPED = "stopped"
UNAVAILABLE = "unavailable"


class UsageRefused(Exception):
    """A Job that may not start, and why, in words for the people running it."""

    def __init__(self, reason, message):
        super().__init__(message)
        self.reason = reason
        self.message = message

    @property
    def transient(self):
        return self.reason == UNAVAILABLE


class RegistryCannotAnswer(Exception):
    pass


def enabled():
    return settings.USAGE_GATE_ENABLED


def _redis():
    from core.metering.billing import _redis as billing_redis

    return billing_redis()


def _cached(account_id):
    try:
        raw = _redis().get(STATE_KEY.format(account_id))
        return json.loads(raw) if raw else None
    except Exception as exc:  # no cache is a cache miss, not a refusal
        logger.warning("usage gate: cache unreadable: %s", exc)
        return None


def _remember(account_id, state, now):
    try:
        _redis().set(
            STATE_KEY.format(account_id),
            json.dumps({"state": state, "at": now}),
            ex=int(settings.USAGE_GATE_LAST_KNOWN_GOOD_SECONDS) + 3600,
        )
    except Exception as exc:
        logger.warning("usage gate: cache unwritable: %s", exc)


def fetch_billing_state(account_id):
    """The account's Billing state from the Account Registry; None for an account it does not
    know, or one never onboarded. Raises RegistryCannotAnswer for anything else."""
    try:
        response = requests.get(
            f"{settings.ACCOUNT_REGISTRY_URL.rstrip('/')}/accounts/{account_id}",
            headers={"Authorization": f"Bearer {settings.ACCOUNT_REGISTRY_TOKEN}"},
            timeout=5,
        )
    except requests.RequestException as exc:
        raise RegistryCannotAnswer(str(exc))
    if response.status_code == 404:
        return None
    if response.status_code != 200:
        raise RegistryCannotAnswer(f"HTTP {response.status_code}")
    try:
        return response.json()["billing_state"]
    except (ValueError, KeyError) as exc:
        raise RegistryCannotAnswer(f"unreadable answer: {exc}")


def billing_state(account_id, now=None):
    """The account's Billing state, by the cache policy above. Raises RegistryCannotAnswer when
    the Registry cannot answer and there is no last-known-good state to use."""
    now = time.time() if now is None else now
    cached = _cached(account_id)
    if cached and now - cached["at"] < settings.USAGE_GATE_FRESH_SECONDS:
        return cached["state"]
    try:
        state = fetch_billing_state(account_id)
    except RegistryCannotAnswer as exc:
        if (
            cached
            and cached["state"] in MAY_START
            and now - cached["at"] < settings.USAGE_GATE_LAST_KNOWN_GOOD_SECONDS
        ):
            logger.warning(
                "usage gate: Registry cannot answer (%s); %s last seen %s %ds ago, starting",
                exc, account_id, cached["state"], now - cached["at"],
            )
            return cached["state"]
        logger.warning("usage gate: Registry cannot answer (%s) for %s; refusing", exc, account_id)
        raise
    _remember(account_id, state, now)
    return state


def _account_page():
    url = settings.BILLING_ACCOUNT_PAGE_URL
    return f" at {url}" if url else ""


def check_job_may_start(project, now=None):
    """Raises UsageRefused unless a Job of ``project`` may start now."""
    if not enabled():
        return
    account_id = project.billing_account_id or ""
    if not account_id.startswith("acct_"):
        raise UsageRefused(
            NO_OWNER,
            "This Project has no billing owner, so its Jobs cannot start. Ask Bitmaker to set one.",
        )
    try:
        state = billing_state(account_id, now)
    except RegistryCannotAnswer:
        raise UsageRefused(
            UNAVAILABLE,
            "Billing cannot be checked right now, so the Job did not start. Try again in a few minutes.",
        )
    if state in MAY_START:
        return
    if state == "stopped":
        raise UsageRefused(
            STOPPED, "Billing for this Organization is stopped, so its Jobs cannot start."
        )
    if state == "out_of_credit":
        # A cardless Org whose prepaid credit is used up (ADR 0019): a Prepayment clears it.
        raise UsageRefused(
            OUT_OF_CREDIT,
            "This Organization's prepaid credit is used up, so new Jobs cannot start. Jobs "
            "already running continue. They start again once more credit is recorded.",
        )
    raise UsageRefused(
        NOT_SET_UP,
        "Billing is not set up yet for this Organization, so its Jobs cannot start. "
        f"A Billing manager can set it up on the billing account page{_account_page()}.",
    )
