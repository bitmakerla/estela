RESOURCE_TIERS = {
    "TINY": {
        "cpu_request": "128m",
        "cpu_limit": "256m",
        "mem_request": "96Mi",
        "mem_limit": "128Mi",
        "memusage_limit_mb": 108,
    },
    "XSMALL": {
        "cpu_request": "192m",
        "cpu_limit": "384m",
        "mem_request": "192Mi",
        "mem_limit": "256Mi",
        "memusage_limit_mb": 217,
    },
    "SMALL": {
        "cpu_request": "256m",
        "cpu_limit": "512m",
        "mem_request": "384Mi",
        "mem_limit": "512Mi",
        "memusage_limit_mb": 435,
    },
    "MEDIUM": {
        "cpu_request": "256m",
        "cpu_limit": "512m",
        "mem_request": "768Mi",
        "mem_limit": "1Gi",
        "memusage_limit_mb": 870,
    },
    "LARGE": {
        "cpu_request": "512m",
        "cpu_limit": "1024m",
        "mem_request": "1152Mi",
        "mem_limit": "1536Mi",
        "memusage_limit_mb": 1305,
    },
    "XLARGE": {
        "cpu_request": "512m",
        "cpu_limit": "1024m",
        "mem_request": "1536Mi",
        "mem_limit": "2Gi",
        "memusage_limit_mb": 1740,
    },
    "HUGE": {
        "cpu_request": "1024m",
        "cpu_limit": "2048m",
        "mem_request": "3072Mi",
        "mem_limit": "4Gi",
        "memusage_limit_mb": 3480,
    },
    "XHUGE": {
        "cpu_request": "2048m",
        "cpu_limit": "4096m",
        "mem_request": "6144Mi",
        "mem_limit": "8Gi",
        "memusage_limit_mb": 6960,
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


def get_tier_resources(tier_name):
    """Look up tier resources from the predefined dict."""
    if tier_name in RESOURCE_TIERS:
        return RESOURCE_TIERS[tier_name]
    return RESOURCE_TIERS[DEFAULT_TIER]
