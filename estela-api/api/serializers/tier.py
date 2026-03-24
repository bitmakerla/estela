import re

from rest_framework import serializers

from core.models import ResourceTier

K8S_CPU_PATTERN = re.compile(r"^\d+m$")
K8S_MEM_PATTERN = re.compile(r"^\d+(Ki|Mi|Gi|Ti)$")


class ResourceTierSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResourceTier
        fields = ("id", "name", "cpu_request", "cpu_limit", "mem_request", "mem_limit")

    def validate_cpu_request(self, value):
        return self._normalize_cpu(value)

    def validate_cpu_limit(self, value):
        return self._normalize_cpu(value)

    def validate_mem_request(self, value):
        return self._normalize_mem(value)

    def validate_mem_limit(self, value):
        return self._normalize_mem(value)

    def _normalize_cpu(self, value):
        if K8S_CPU_PATTERN.match(value):
            return value
        if value.isdigit():
            return f"{value}m"
        raise serializers.ValidationError("Must be a number (millicores) or format like '256m'.")

    def _normalize_mem(self, value):
        if K8S_MEM_PATTERN.match(value):
            return value
        if value.isdigit():
            return f"{value}Mi"
        raise serializers.ValidationError("Must be a number (MiB) or format like '384Mi', '1Gi'.")
