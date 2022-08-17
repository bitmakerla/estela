import os
import logging
import sys
import threading
import time


BATCH_SIZE_THRESHOLD = int(os.getenv("BATCH_SIZE_THRESHOLD", "4096"))
INSERT_TIME_THRESHOLD = int(os.getenv("INSERT_TIME_THRESHOLD", "5"))
ACTIVITY_TIME_THRESHOLD = int(os.getenv("ACTIVITY_TIME_THRESHOLD", "600"))


class Inserter:
    def __init__(self, client, database_name, collection_name, unique):
        self.database_name = database_name
        self.collection_name = collection_name
        self.unique = unique
        self.identifier = "{}/{}".format(database_name, collection_name)

        self.__client = client
        self.__items = []
        self.__lock = threading.Lock()
        self.__last_activity = time.time()
        self.__last_insertion = time.time()

        logging.info("New Inserter created for {}.".format(self.identifier))

    def __insert_items(self):
        response = self.__client.insert_many_to_collection(
            self.database_name, self.collection_name, self.__items
        )
        logging.debug(
            "{} documents inserted in {}.".format(len(self.__items), self.identifier)
        )
        self.__items = []
        return response

    def is_inactive(self):
        return time.time() - self.__last_activity > ACTIVITY_TIME_THRESHOLD

    def insert(self, item):
        if self.unique:
            self.__client.insert_one_to_unique_collection(
                self.database_name, self.collection_name, item
            )
            logging.debug("1 document inserted in {}.".format(self.identifier))
        else:
            with self.__lock:
                self.__items.append(item)
                if (
                    sys.getsizeof(self.__items) > BATCH_SIZE_THRESHOLD
                    or time.time() - self.__last_insertion > INSERT_TIME_THRESHOLD
                ):
                    response = self.__insert_items()

        self.__last_insertion = time.time()
        self.__last_activity = time.time()

    def flush(self):
        if not self.unique:
            with self.__lock:
                if len(self.__items):
                    response = self.__insert_items()
                    self.__last_activity = time.time()
