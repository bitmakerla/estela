from engines.kubernetes import KubernetesEngine


def JobManager(engine):
    engines = {
        "kubernetes": KubernetesEngine,
    }

    return engines[engine]()
