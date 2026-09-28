"""The re-encoded hash must still prove the same password, or nobody can sign in after migrating."""

import base64
import hashlib
import hmac

from django.contrib.auth.hashers import PBKDF2PasswordHasher, make_password
from django.test import SimpleTestCase

from core.management.commands.import_users_to_idp import zitadel_hash


def passwap_checks(encoded, password):
    """What Zitadel's passwap does with `$pbkdf2-sha256$<rounds>$<salt>$<hash>`."""
    _, ident, rounds, salt, digest = encoded.split("$")
    decode = lambda s: base64.b64decode(s.replace(".", "+") + "=" * (-len(s) % 4))
    expected = decode(digest)
    derived = hashlib.pbkdf2_hmac("sha256", password.encode(), decode(salt), int(rounds), len(expected))
    return ident == "pbkdf2-sha256" and hmac.compare_digest(derived, expected)


class ZitadelHashTest(SimpleTestCase):
    def test_same_password_still_matches(self):
        # The test settings only enable MD5, so call Django's PBKDF2 hasher directly.
        hasher = PBKDF2PasswordHasher()
        encoded = zitadel_hash(hasher.encode("Migra-Passw0rd!", hasher.salt()))
        self.assertTrue(passwap_checks(encoded, "Migra-Passw0rd!"))
        self.assertFalse(passwap_checks(encoded, "otra"))

    def test_unusable_or_foreign_hashes_are_skipped(self):
        self.assertIsNone(zitadel_hash(make_password(None)))
        self.assertIsNone(zitadel_hash("argon2$argon2id$v=19$m=102400,t=2,p=8$c2FsdA$aGFzaA"))
