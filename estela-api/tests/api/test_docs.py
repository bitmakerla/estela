import os
from io import StringIO

from django.core.management import call_command
from django.test import SimpleTestCase


class TestOpenAPISpec(SimpleTestCase):
    """Test for the generated OpenAPI specification."""

    def test_generate_swagger_output_matches_committed_spec(self):
        """Tests that the committed spec matches the current state of views."""
        spec_path = os.path.join(
            os.path.abspath(os.path.dirname(__file__)), "../../docs/api.yaml"
        )
        with open(spec_path) as file:
            committed_spec = file.read()
            out = StringIO()
            call_command(
                "generate_swagger",
                "--format=yaml",
                stdout=out,
            )
            generated_spec = out.getvalue()
            self.assertIn("swagger: '2.0'", generated_spec)
            self.assertEqual(committed_spec, generated_spec)
