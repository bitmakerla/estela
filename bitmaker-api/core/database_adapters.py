import json
import pymongo

from abc import ABCMeta, abstractmethod
from bson.json_util import loads
from django.conf import settings
from pymongo.errors import ConnectionFailure

class DatabaseInterface(metaclass=ABCMeta):

    @abstractmethod
    def get_connection(self): pass
    
    @abstractmethod
    def delete_collection_data(self): pass

    @abstractmethod
    def get_all_collection_data(self): pass

    @abstractmethod
    def get_paginated_collection_data(self): pass

    @abstractmethod
    def get_estimated_document_count(self): pass

    @abstractmethod
    def insert_unique_collection_data(self): pass

    @abstractmethod
    def insert_collection_data(self): pass


class MongoAdapter(DatabaseInterface):
    def __init__(self, mongo_connection, mongo_production, mongo_certificate_path):
        self.mongo_connection = mongo_connection
        self.mongo_production = mongo_production
        self.mongo_certificate_path = mongo_certificate_path

    def get_connection(self):
        try:
            if self.mongo_production:
                client = pymongo.MongoClient(
                    self.mongo_connection,
                    tls=True,
                    tlsCAFile=self.mongo_certificate_path,
                )
                client.admin.command("ismaster")
            else:
                client = pymongo.MongoClient(self.mongo_connection)
        except ConnectionFailure:
            client = None
            return False
        self.client = client
        return True

    def delete_collection_data(self, database_name, collection_name):
        collection = self.client[database_name][collection_name]
        return collection.delete_many({}).deleted_count

    def get_all_collection_data(self, database_name, collection_name):
        collection = self.client[database_name][collection_name]
        result = collection.find()
        result = loads(json.dumps(list(result), default=str))
        return result
    
    def get_paginated_collection_data(self, database_name, collection_name, page, page_size):
        self.collection = self.client[database_name][collection_name]
        result = self.collection.find().skip(page_size * (page - 1)).limit(page_size)
        result = loads(json.dumps(list(result), default=str))
        return result

    def get_estimated_document_count(self):
        return self.collection.estimated_document_count()

    def insert_unique_collection_data(self,database_name, collection_name, data):
        self.client[database_name][collection_name].update_one(data, {"$set": data}, upsert=True)
    
    def insert_collection_data(self,database_name, collection_name, data):
        self.client[database_name][collection_name].insert_one(data)



def get_database_interface():
    mongo_certificate_path = "config/mongo_certificate/ca-certificate.crt"
    return MongoAdapter(settings.MONGO_CONNECTION,settings.MONGO_PRODUCTION,mongo_certificate_path)