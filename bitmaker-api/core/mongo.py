import pymongo

from django.conf import settings
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


def get_database_size(project, data_type):
    client = get_client(settings.MONGO_CONNECTION)
    if not client:
        return -1

    database = client[str(project.pid)]
    collections = database.list_collection_names()
    total_size_bytes = 0
    for collection in collections:
        if data_type in collection:
            collection_size = database.command(
                "dataSize", f"{str(project.pid)}.{collection}"
            )
            total_size_bytes += collection_size["size"]

    return total_size_bytes
