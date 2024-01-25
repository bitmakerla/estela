from abc import ABCMeta, abstractmethod
import logging

import pymongo
import pyodbc
import threading
from bson.objectid import ObjectId
from pymongo.errors import ConnectionFailure, PyMongoError

logger = logging.getLogger(__name__)


class InsertionResponse:
    def __init__(self, ok, exception=None, need_upsert=False):
        self.ok = ok
        self.need_upsert = need_upsert
        self.error = None if (ok or exception is None) else f"{exception.__class__.__name__}: {str(exception)}"

class DatabaseReaderInterface(metaclass=ABCMeta):
    """Database adapter that just support read operations."""

    @abstractmethod
    def get_connection(self):
        pass

    @abstractmethod
    def get_all_dataset_data(self):
        pass

    @abstractmethod
    def get_chunked_dataset_data(self):
        pass

    @abstractmethod
    def get_paginated_dataset_data(self):
        pass

    @abstractmethod
    def get_estimated_item_count(self):
        pass

    @abstractmethod
    def get_estimated_item_size(self):
        pass

    @abstractmethod
    def get_database_size(self):
        pass

class DatabaseWriterInterface(metaclass=ABCMeta):
    """Database adapter that just support write operations."""

    @abstractmethod
    def get_connection(self):
        pass

    @abstractmethod
    def delete_dataset_data(self):
        pass

    @abstractmethod
    def insert_one_to_unique_dataset(self):
        pass

    @abstractmethod
    def insert_one_to_dataset(self):
        pass

    @abstractmethod
    def insert_many_to_dataset(self):
        pass
  

class MongoAdapter(DatabaseWriterInterface, DatabaseReaderInterface):
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

    def delete_dataset_data(self, database_name, collection_name):
        collection = self.client[database_name][collection_name]
        try:
            collection.drop()
            return True
        except PyMongoError as ex:
            print(ex)
            return False

    def get_dataset_data(self, database_name, collection_name, limit=10000):
        collection = self.client[database_name][collection_name]
        result = collection.find({}, {"_id": False}).limit(limit)
        return list(result)

    def get_all_dataset_data(self, database_name, collection_name):
        collection = self.client[database_name][collection_name]
        result = collection.find({}, {"_id": False})
        return list(result)

    def get_chunked_dataset_data(
        self, database_name, collection_name, chunk_size, current_chunk=None
    ):
        collection = self.client[database_name][collection_name]
        result = (
            collection.find({"_id": {"$gt": ObjectId(current_chunk)}}).limit(chunk_size)
            if current_chunk
            else collection.find().limit(chunk_size)
        )
        data = list(result)
        next_chunk = str(data[-1]["_id"]) if len(data) > 0 else None
        for item in data:
            del item["_id"]
        return data, next_chunk

    def get_job_stats(self, database_name, collection_name):
        result = self.client[database_name]["job_stats"].find(
            {"_id": collection_name}, {"_id": False}
        )
        return list(result)

    def get_jobs_set_stats(self, database_name, jobs_ids):
        result = self.client[database_name]["job_stats"].find(
            {"_id": {"$in": jobs_ids}}
        )
        return list(result)

    def get_paginated_dataset_data(
        self, database_name, collection_name, page, page_size
    ):
        collection = self.client[database_name][collection_name]
        result = (
            collection.find({}, {"_id": False})
            .skip(page_size * (page - 1))
            .limit(page_size)
        )
        return list(result)

    def update_document(self, database_name, collection_name, document_id, new_field):
        collection = self.client[database_name][collection_name]
        result = collection.update_one({"_id": document_id}, {"$set": new_field})
        return result.acknowledged

    def get_estimated_item_count(self, database_name, collection_name):
        collection = self.client[database_name][collection_name]
        return collection.estimated_document_count()

    def get_estimated_item_size(self, database_name, collection_name):
        database = self.client[database_name]
        document_size = database.command("collstats", collection_name)["avgObjSize"]
        return document_size

    def insert_one_to_unique_dataset(self, database_name, collection_name, item):
        response = None
        try:
            self.client[database_name][collection_name].update_one(
                item, {"$set": item}, upsert=True
            )
            response = InsertionResponse(True)
        except Exception as ex:
            response = InsertionResponse(False, ex)
        finally:
            return response

    def insert_one_to_dataset(self, database_name, collection_name, item):
        response = None
        try:
            self.client[database_name][collection_name].insert_one(item)
            response = InsertionResponse(True)
        except Exception as ex:
            response = InsertionResponse(False, ex)
        finally:
            return response

    def insert_many_to_dataset(
        self, database_name, collection_name, items, ordered=False
    ):
        response = None
        try:
            self.client[database_name][collection_name].insert_many(
                items, ordered=ordered
            )
            response = InsertionResponse(True)
        except Exception as ex:
            response = InsertionResponse(False, ex, need_upsert=True)
        finally:
            return response

    def get_database_size(self, database_name, data_type):
        database = self.client[database_name]
        collections = database.list_collection_names()
        total_size_bytes = 0
        for collection in collections:
            if data_type in collection:
                total_size_bytes += self.get_dataset_size(database_name, collection)
        return total_size_bytes

    def get_dataset_size(self, database_name, collection_name):
        database = self.client[database_name]
        collection_size = database.command("collstats", collection_name)["size"]
        return collection_size

class SqlServerWriterAdapter(DatabaseWriterInterface):

    def __init__(self, connection_string, production, certificate_path):
        self.connection_string = connection_string
        self.local_storage = threading.local()

    def get_connection(self):
        if not hasattr(self.local_storage, 'connection'):
            try:
                self.local_storage.connection = pyodbc.connect(self.connection_string)
                return True
            except Exception as e:
                print(f"Error connecting to SQL Server: {e}")
                return False
        return True
        
    def _execute_query(self, database_name, query, values=(), execute_many=False):
        if not self.get_connection():
            return False, "Connection Error"

        try:
            with self.local_storage.connection.cursor() as cursor:
                logger.debug("Executing query: %s", query)
                if not execute_many:
                    cursor.execute(f"USE {database_name}")
                    cursor.execute(query, values)
                else:
                    cursor.execute(f"USE {database_name}")
                    cursor.executemany(query, values)
                self.local_storage.connection.commit()
                return True, None
        except pyodbc.Error as e:
            self.local_storage.connection.rollback()
            logger.debug("Error executing query: %s", query)
            return False, e

    def insert_one_to_dataset(self, database_name, table_name, item):
        # It should `transform`` the item into a valid sql item.
        columns = ', '.join(item.keys())
        placeholders = ', '.join('?' * len(item))
        query = f"INSERT INTO {table_name} ({columns}) VALUES ({placeholders})"
        response, ex = self._execute_query(database_name, query, values=list(item.values()))
        return InsertionResponse(response, ex)
        
    def insert_many_to_dataset(self, database_name, table_name, items):
        columns = ', '.join(items[0].keys())
        placeholders = ', '.join('?' * len(items[0]))
        logger.debug("items :%s", str(items))
        query = f"INSERT INTO {table_name} ({columns}) VALUES ({placeholders})"
        values_to_insert = [tuple(item.values()) for item in items]
        logger.debug("values to insert: %s", str(values_to_insert))
        response, ex = self._execute_query(database_name, query, values_to_insert, execute_many=True)
        # no upsert needed as execute_many is atomic
        return InsertionResponse(response, ex)

    def delete_dataset_data(self, database_name, table_name):
        query = f"DELETE FROM {table_name}"
        response, ex= self._execute_query(database_name, query)
        return InsertionResponse(response, ex)
    
    def insert_one_to_unique_dataset(self, database_name, table_name, item): # Needs more discussion.
        return self.insert_one_to_dataset(database_name, table_name, item)

def get_database_interface(engine, connection, production, certificate_path):
    database_interfaces = {
        "mongodb": MongoAdapter(connection, production, certificate_path),
    }
    return database_interfaces[engine]

def get_database_writer_interface(engine, connection, production, certificate_path):
    database_interfaces = {
        "mongodb": MongoAdapter(connection, production, certificate_path),
        "sqlserver": SqlServerWriterAdapter(connection, production, certificate_path),
    }
    return database_interfaces[engine]
