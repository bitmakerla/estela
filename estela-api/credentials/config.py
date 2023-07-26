from credentials.aws import AWSCredentials
from credentials.gcp import GCPCredentials
from credentials.local import LocalCredentials


def Credentials(plataform):
    credentials = {
        "aws": AWSCredentials,
        "local": LocalCredentials,
        "gcp": GCPCredentials
    }

    return credentials[plataform]()
