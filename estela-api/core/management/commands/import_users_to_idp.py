"""Moves estela's accounts to the identity provider, keeping each person's password and projects.

For every estela user it makes sure there is a matching person in Zitadel, then stores that
person's id as the user's `oidc_sub`. Once sign-in moves to the provider, it lands on the same
row, with the same projects; until then the column is already usable as the person's id across
products (billing sums usage by it). Linking here, by id, instead of matching by email on the
first sign-in means nobody depends on having a unique, verified address.

Passwords are not reset: Django's PBKDF2 hash is handed to Zitadel as is (re-encoded), and
Zitadel checks it on the first sign-in and re-hashes it with its own algorithm. That needs
ZITADEL_SYSTEMDEFAULTS_PASSWORDHASHER_VERIFIERS=pbkdf2 on the Zitadel side.

Safe to run again: a person who already exists in Zitadel (same username) is only linked.

    echo "$PAT" | python manage.py import_users_to_idp --issuer https://auth.example --dry-run
    echo "$PAT" | python manage.py import_users_to_idp --issuer https://auth.example

The token is read from stdin (or ZITADEL_PAT) so it never shows up in the process list.
"""

import base64
import os
import sys

import requests
from django.contrib.auth.models import User
from django.core.management.base import BaseCommand, CommandError

from core.models import UserProfile

# System accounts that never sign in as a person: builds report with their own run token.
SKIP = {"deploy_manager"}
DJANGO_TO_PASSWAP = {"pbkdf2_sha256": "pbkdf2-sha256", "pbkdf2_sha1": "pbkdf2"}


def passlib_b64(raw):
    """The base64 variant passlib and Zitadel's passwap use: `.` for `+`, no padding."""
    return base64.b64encode(raw).decode().rstrip("=").replace("+", ".")


def zitadel_hash(django_hash):
    """`pbkdf2_sha256$<rounds>$<salt>$<b64>` -> `$pbkdf2-sha256$<rounds>$<salt>$<hash>`, or None."""
    parts = (django_hash or "").split("$")
    if len(parts) != 4 or parts[0] not in DJANGO_TO_PASSWAP:
        return None
    algorithm, rounds, salt, digest = parts
    return "${}${}${}${}".format(
        DJANGO_TO_PASSWAP[algorithm],
        rounds,
        passlib_b64(salt.encode()),  # Django uses the salt string itself as the bytes
        passlib_b64(base64.b64decode(digest)),
    )


class Command(BaseCommand):
    help = "Create estela's users in the identity provider and link them by oidc_sub."

    def add_arguments(self, parser):
        parser.add_argument("--issuer", required=True, help="The provider's URL, e.g. https://auth.example")
        parser.add_argument("--dry-run", action="store_true", help="Show the plan, change nothing.")

    def handle(self, *args, issuer, dry_run, **options):
        token = os.environ.get("ZITADEL_PAT") or ("" if sys.stdin.isatty() else sys.stdin.read().strip())
        if not token:
            raise CommandError("Needs an admin token on stdin or in ZITADEL_PAT.")
        self.api = requests.Session()
        self.api.headers["Authorization"] = f"Bearer {token}"
        self.issuer = issuer.rstrip("/")

        self.stdout.write(f"{'usuario':18} {'acción':22} {'contraseña':14} {'activo':7} proyectos")
        for user in User.objects.select_related("profile").order_by("id"):
            if user.username in SKIP:
                self.stdout.write(f"{user.username:18} {'se omite (sistema)':22}")
                continue
            self.move(user, dry_run)
        if dry_run:
            self.stdout.write("\nModo prueba: no se cambió nada.")

    def move(self, user, dry_run):
        existing = self.find(user.username)
        password = zitadel_hash(user.password)
        if existing:
            action, zid = "enlazar (ya existe)", existing
        elif dry_run:
            action, zid = "crear", None
        else:
            action, zid = "crear", self.create(user, password)

        if zid and not dry_run:
            if not user.is_active:
                self.api.post(f"{self.issuer}/v2/users/{zid}/deactivate", json={}, timeout=15)
            clash = UserProfile.objects.filter(oidc_sub=zid).exclude(user=user).first()
            if clash:
                action = f"CONFLICTO con {clash.user.username}"
            else:
                UserProfile.objects.filter(user=user).update(oidc_sub=zid)

        kept = "propia" if password else "sin contraseña"
        if existing:
            kept = "la de Zitadel"
        self.stdout.write(
            f"{user.username:18} {action:22} {kept:14} {str(user.is_active):7} {user.project_set.count()}"
        )

    def find(self, username):
        r = self.api.post(
            f"{self.issuer}/v2/users",
            json={"queries": [{"userNameQuery": {"userName": username}}]},
            timeout=15,
        )
        r.raise_for_status()
        return next((u["userId"] for u in r.json().get("result", []) if u.get("username") == username), None)

    def create(self, user, password):
        body = {
            "username": user.username,
            "profile": {
                "givenName": user.first_name or user.username,
                "familyName": user.last_name or user.username,
            },
            # Their estela address is trusted as is: estela verified it when they signed up.
            # `.invalid` is reserved, so an account without one can never collide with a real one.
            "email": {"email": user.email or f"{user.username}@estela.invalid", "isVerified": True},
        }
        if password:
            body["hashedPassword"] = {"hash": password, "changeRequired": False}
        r = self.api.post(f"{self.issuer}/v2/users/human", json=body, timeout=15)
        if not r.ok:
            raise CommandError(f"Zitadel refused {user.username}: {r.status_code} {r.text[:200]}")
        return r.json()["userId"]
