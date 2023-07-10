import os
import logging
import sys
import threading
import time

from estela_queue_adapter import get_producer_interface


BATCH_SIZE_THRESHOLD = int(os.getenv("BATCH_SIZE_THRESHOLD", "4096"))
INSERT_TIME_THRESHOLD = int(os.getenv("INSERT_TIME_THRESHOLD", "5"))
ACTIVITY_TIME_THRESHOLD = int(os.getenv("ACTIVITY_TIME_THRESHOLD", "600"))

producer = get_producer_interface()
producer.get_connection()


class Inserter:
    def __init__(self, client, database_name, collection_name, unique, topic):
        self.database_name = database_name
        self.collection_name = collection_name
        self.unique = unique
        self.topic = topic
        self.identifier = "{}/{}".format(database_name, collection_name)

        self.__client = client
        self.__items = []
        self.__lock = threading.Lock()
        self.__op_lock = threading.Lock()
        self.__last_activity = time.time()
        self.__last_insertion = time.time()
        self.__pending_items_count = 0

        logging.info("New Inserter created for {}.".format(self.identifier))

    def is_job_stats(self, collection_name):
        return "job_stats" == collection_name.split("-")[2]

    def __handle_insertion_error(self, response, items):
        logging.warning(
            "The exception [{}] occurred during the insertion of {} items in {}.".format(
                response.error, len(items), self.identifier
            )
        )
        for item in items:
            if item["payload"].get("_id"):
                del item["payload"]["_id"]
            if response.need_upsert:
                item["need_upsert"] = "True"
            producer.send(self.topic, item)

    def __insert_items(self, reason):
        if self.is_job_stats(self.collection_name):
            self.__items[0]["payload"]["_id"] = self.collection_name
            response = self.__client.insert_one_to_collection(
                self.database_name,
                "job_stats",
                self.__items[0]["payload"],
            )
        else:
            response = self.__client.insert_many_to_collection(
                self.database_name,
                self.collection_name,
                [item["payload"] for item in self.__items],
            )
        if response.ok:
            logging.info(
                "{} documents inserted [{}] in {}.".format(
                    len(self.__items), reason, self.identifier
                )
            )
        else:
            self.__handle_insertion_error(response, self.__items)

        del self.__items[:]

    def is_inactive(self):
        return time.time() - self.__last_activity > ACTIVITY_TIME_THRESHOLD

    def add_pending_item(self):
        with self.__op_lock:
            self.__pending_items_count += 1

    def has_pending_items(self):
        return self.__pending_items_count > 0

    def insert(self, item):
        if self.unique or item.get("need_upsert"):
            response = self.__client.insert_one_to_unique_collection(
                self.database_name, self.collection_name, item["payload"]
            )
            if response.ok:
                logging.debug("1 document inserted in {}.".format(self.identifier))
            else:
                self.__handle_insertion_error(response, [item])
        else:
            with self.__lock:
                self.__items.append(item)
                if sys.getsizeof(self.__items) > BATCH_SIZE_THRESHOLD:
                    self.__insert_items("size threshold")
                elif time.time() - self.__last_insertion > INSERT_TIME_THRESHOLD:
                    self.__insert_items("time threshold")

        self.__last_insertion = time.time()
        self.__last_activity = time.time()
        with self.__op_lock:
            self.__pending_items_count -= 1

    def flush(self, reason):
        if not self.unique:
            with self.__lock:
                if len(self.__items) > 0:
                    self.__insert_items("{} flush".format(reason))
                    self.__last_activity = time.time()
