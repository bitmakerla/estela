from engines.kubernetes import KubernetesEngine
from engines.docker import DockerEngine


def JobManager(engine):
    """
    Factory function that returns the appropriate job engine.

    Available engines:
    - kubernetes: Uses Kubernetes Jobs (requires K8s cluster)
    - docker: Uses Docker containers (simpler, for local/small deployments)

    Set the ENGINE environment variable to choose which engine to use.
    """
    engines = {
        "kubernetes": KubernetesEngine,
        "docker": DockerEngine,
    }

    if engine not in engines:
        available = ", ".join(engines.keys())
        raise ValueError(
            f"Unknown engine '{engine}'. Available engines: {available}"
        )

    return engines[engine]()
