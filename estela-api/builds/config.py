from builds.default import DefaultBuild
from builds.gcp import GCPBuild

def Build(type):
    builds = {
        "default": DefaultBuild,
        "gcp": GCPBuild
    }

    return builds[type]()
