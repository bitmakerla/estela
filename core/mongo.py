import pymongo

from ***REMOVED***.conf import settings
from pymongo.errors import ConnectionFailure


def get_client(db_connection):
    try:
        if settings.MONGO_PRODUCTION:
            client = pymongo.MongoClient(
                db_connection,
                tls=True,
                tlsCAFile="config/mongo_certificate/ca-certificate.crt",
            )
            client.admin.command("ismaster")
        else:
            client = pymongo.MongoClient(db_connection)
    except ConnectionFailure:
        return None
    return client
