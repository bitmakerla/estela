from ***REMOVED***.core.exceptions import ValidationError


class AlphanumericValidator:
    def validate(self, password, user=None):
        if not any(character.isdigit() for character in password):
            raise ValidationError(
                "This password must contain both letters and numbers.",
                code="not_alphanumeric",
            )

    def get_help_text(self):
        return "Your password must contain both letters and numbers."


class MixedCaseValidator:
    def validate(self, password, user=None):
        if password.islower() or password.isupper():
            raise ValidationError(
                "This password must contain both lowercase and uppercase characters.",
                code="not_mixed_case",
            )

    def get_help_text(self):
        return "Your password must contain both lowercase and uppercase characters."
