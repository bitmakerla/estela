from credentials.aws import AWSCredentials
from credentials.gcp import GCPCredentials
from credentials.local import LocalCredentials


def Credentials(platform):
    credentials = {
        "aws": AWSCredentials,
        "gcp": GCPCredentials,
        "local": LocalCredentials,
    }

    return credentials[platform]()
