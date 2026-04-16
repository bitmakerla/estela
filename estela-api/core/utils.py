def parse_k8s_resource(value):
    """Parse a Kubernetes resource string into its base unit (bytes for memory, cores for CPU)."""
    value = str(value)
    if value.endswith("m"):
        return float(value[:-1]) / 1000
    if value.endswith("Ki"):
        return float(value[:-2]) * 1024
    if value.endswith("Mi"):
        return float(value[:-2]) * 1024 * 1024
    if value.endswith("Gi"):
        return float(value[:-2]) * 1024 * 1024 * 1024
    if value.endswith("Ti"):
        return float(value[:-2]) * 1024 * 1024 * 1024 * 1024
    if value.endswith("k"):
        return float(value[:-1]) * 1000
    if value.endswith("M"):
        return float(value[:-1]) * 1000 * 1000
    if value.endswith("G"):
        return float(value[:-1]) * 1000 * 1000 * 1000
    try:
        return float(value)
    except ValueError:
        return 0


def parse_memory_to_mi(value):
    """Parse a Kubernetes memory string into Mi (mebibytes)."""
    return parse_k8s_resource(value) / (1024 * 1024)
