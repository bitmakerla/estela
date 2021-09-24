import pymongo
from pymongo.errors import ConnectionFailure


def get_client(db_connection):
    try:
        client = pymongo.MongoClient(
            db_connection,
            tls=True,
            tlsCAFile="config/mongo_certificate/ca-certificate.crt",
        )
        client.admin.command("ismaster")
    except ConnectionFailure:
        return None
    return client
