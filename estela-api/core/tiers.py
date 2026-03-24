RESOURCE_TIERS = {
    "TINY": {
        "cpu_request": "128m",
        "cpu_limit": "256m",
        "mem_request": "96Mi",
        "mem_limit": "128Mi",
    },
    "XSMALL": {
        "cpu_request": "192m",
        "cpu_limit": "384m",
        "mem_request": "192Mi",
        "mem_limit": "256Mi",
    },
    "SMALL": {
        "cpu_request": "256m",
        "cpu_limit": "512m",
        "mem_request": "384Mi",
        "mem_limit": "512Mi",
    },
    "MEDIUM": {
        "cpu_request": "256m",
        "cpu_limit": "512m",
        "mem_request": "768Mi",
        "mem_limit": "1Gi",
    },
    "LARGE": {
        "cpu_request": "512m",
        "cpu_limit": "1024m",
        "mem_request": "1152Mi",
        "mem_limit": "1536Mi",
    },
    "XLARGE": {
        "cpu_request": "512m",
        "cpu_limit": "1024m",
        "mem_request": "1536Mi",
        "mem_limit": "2Gi",
    },
    "HUGE": {
        "cpu_request": "1024m",
        "cpu_limit": "2048m",
        "mem_request": "3072Mi",
        "mem_limit": "4Gi",
    },
    "XHUGE": {
        "cpu_request": "2048m",
        "cpu_limit": "4096m",
        "mem_request": "6144Mi",
        "mem_limit": "8Gi",
    },
}

DEFAULT_TIER = "LARGE"

TIER_CHOICES = [
    ("TINY", "Tiny"),
    ("XSMALL", "XSmall"),
    ("SMALL", "Small"),
    ("MEDIUM", "Medium"),
    ("LARGE", "Large"),
    ("XLARGE", "XLarge"),
    ("HUGE", "Huge"),
    ("XHUGE", "XHuge"),
]


def get_tier_resources(tier_name, project=None):
    """Look up tier resources from hardcoded dict, then fall back to DB custom tiers."""
    if tier_name in RESOURCE_TIERS:
        return RESOURCE_TIERS[tier_name]

    # Fall back to DB for custom tiers
    from core.models import ResourceTier

    try:
        filters = {"name": tier_name}
        if project is not None:
            filters["project"] = project
        custom = ResourceTier.objects.get(**filters)
        return {
            "cpu_request": custom.cpu_request,
            "cpu_limit": custom.cpu_limit,
            "mem_request": custom.mem_request,
            "mem_limit": custom.mem_limit,
        }
    except (ResourceTier.DoesNotExist, ResourceTier.MultipleObjectsReturned):
        return RESOURCE_TIERS[DEFAULT_TIER]
