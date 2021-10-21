from core.registry import get_registry_token
from tests.base import BaseTestCase


class TestRegistry(BaseTestCase):
    def test_get_registry_token(self):
        token = get_registry_token()
        self.assertIsNotNone(token)
        self.assertIsNot(token, "")
