import re

from django.conf import settings
from rest_framework import serializers


class JobRamLimitValidator:
    CONVERSIONS = {"Mi": 1024**2, "Gi": 1024**3}

    def convert_to_bytes(self, value):
        """Converts a string like "256Mi" or "1Gi" to the number of bytes"""
        match = re.match(r"(\d+)(Mi|Gi)", value)
        if not match:
            raise serializers.ValidationError(f"Invalid RAM limit: {value}")
        value, unit = match.groups()
        return int(value) * self.CONVERSIONS[unit]

    def __init__(self, *args, **kwargs):
        self.MIN_RAM = self.convert_to_bytes(settings.JOB_MIN_RAM_LIMIT)
        self.MAX_RAM = self.convert_to_bytes(settings.JOB_MAX_RAM_LIMIT)

    def __call__(self, limits):
        requested_ram = self.convert_to_bytes(limits.get("memory"))
        if requested_ram < self.MIN_RAM or requested_ram > self.MAX_RAM:
            raise serializers.ValidationError(
                f"Invalid RAM limit. Set a value between {settings.JOB_MIN_RAM_VALUE} and {settings.JOB_MAX_RAM_VALUE}.",
                code="invalid_ram_limit",
            )
