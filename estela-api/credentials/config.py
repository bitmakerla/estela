from credentials.local import LocalCredentials
from credentials.aws import AWSCredentials


def Credentials(plataform):
    credentials = {
        "aws": AWSCredentials,
        "local": LocalCredentials,
    }

    return credentials[plataform]()
