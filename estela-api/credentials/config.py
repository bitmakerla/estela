from credentials.aws import AWSCredentials
from credentials.local import LocalCredentials


def Credentials(plataform):
    credentials = {
        "aws": AWSCredentials,
        "local": LocalCredentials,
    }

    return credentials[plataform]()
