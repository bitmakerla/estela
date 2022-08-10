import os
import sys
import json
import logging
import threading
import time

from queue import Queue
from kafka import KafkaConsumer
from config.database_manager import db_client
from inserter import Inserter


WORKER_POOL = 10
HEARTBEAT_TICK = 600  # seconds
QUEUE_BASE_TIMEOUT = 10  # seconds
QUEUE_MAX_TIMEOUT = 600  # seconds

item_queue = Queue()
inserters = {}
heartbeat_lock = threading.Lock()


def connect_kafka_consumer(topic_name):
    _consumer = None
    kafka_advertised_port = os.getenv("KAFKA_ADVERTISED_PORT", "9092")
    kafka_advertised_listeners = os.getenv("KAFKA_ADVERTISED_LISTENERS").split(",")
    bootstrap_servers = [
        "{}:{}".format(kafka_advertised_listener, kafka_advertised_port)
        for kafka_advertised_listener in kafka_advertised_listeners
    ]
    try:
        max_poll_interval_ms = (QUEUE_MAX_TIMEOUT + 1) * 1000
        _consumer = KafkaConsumer(
            topic_name,
            bootstrap_servers=bootstrap_servers,
            auto_offset_reset="earliest",
            enable_auto_commit=True,
            auto_commit_interval_ms=1000,
            group_id="group_{}".format(topic_name),
            api_version=(0, 10),
            value_deserializer=lambda x: json.loads(x.decode("utf-8")),
            max_poll_interval_ms=max_poll_interval_ms,
            session_timeout_ms=max_poll_interval_ms,
            request_timeout_ms=max_poll_interval_ms + 1,
            connections_max_idle_ms=max_poll_interval_ms + 2,
        )
    except Exception as ex:
        logging.error("Exception while connecting Kafka.")
        logging.error(str(ex))
    finally:
        return _consumer


# https://stackoverflow.com/questions/12397118/mongodb-dot-in-key-name
def mongo_jsonify(item):
    new_item = {}
    if type(item) is dict:
        for key, value in item.items():
            new_key = key.replace(".", "\\u002e")
            if type(value) is dict:
                new_item[new_key] = mongo_jsonify(value)
            elif type(value) is list:
                new_item[new_key] = [mongo_jsonify(x) for x in value]
            else:
                new_item[new_key] = item[key]
        return new_item
    else:
        return item


def read_from_queue():
    current_timeout = QUEUE_BASE_TIMEOUT
    while True:
        if heartbeat_lock.locked():
            return
        try:
            item = item_queue.get(timeout=current_timeout)
            current_timeout = QUEUE_BASE_TIMEOUT
        except:
            next_timeout = current_timeout * 2
            current_timeout = (
                QUEUE_MAX_TIMEOUT if next_timeout > QUEUE_MAX_TIMEOUT else next_timeout
            )
            for identifier, inserter in inserters.items():
                inserter.flush()
            continue

        item = mongo_jsonify(item)
        try:
            inserters[item["identifier"]].insert(item["payload"])
        except:
            logging.warning(
                "An exception occurs during the insertion in {}.".format(
                    item["identifier"]
                )
            )
        item_queue.task_done()


def start_workers():
    workers = []
    for i in range(WORKER_POOL):
        worker = threading.Thread(target=read_from_queue)
        worker.start()
        workers.append(worker)
    return workers


def heartbeat():
    while True:
        workers = start_workers()
        time.sleep(HEARTBEAT_TICK)

        with heartbeat_lock:
            logging.debug("Heartbeat: A new inspection has started.")

            for worker in workers:
                worker.join()

            for identifier, inserter in inserters.items():
                if inserter.is_inactive():
                    inserter.flush()
                    del inserters[identifier]

            logging.debug("Heartbeat: {} alive inserters.".format(len(inserters)))


def consume_from_kafka(topic_name):
    if db_client.get_connection():
        logging.info("DB connection established.")
    else:
        raise Exception("Could not connect to the DB.")

    consumer = connect_kafka_consumer(topic_name)
    _heartbeat = threading.Thread(target=heartbeat, daemon=True)
    _heartbeat.start()

    for message in consumer:
        if heartbeat_lock.locked():
            heartbeat_lock.acquire()
            heartbeat_lock.release()

        job, spider, project = message.value["jid"].split(".")

        collection_name = "{}-{}-{}".format(spider, job, topic_name)
        identifier = "{}/{}".format(project, collection_name)
        unique = message.value.get("unique", "False") == "True"

        if inserters.get(identifier) is None:
            inserters[identifier] = Inserter(
                db_client, project, collection_name, unique
            )
        else:
            inserters[identifier].last_activity = time.time()

        item_queue.put({"identifier": identifier, "payload": message.value["payload"]})

    item_queue.join()
    consumer.close()


def main():
    logging.basicConfig(level=logging.INFO)
    try:
        consume_from_kafka(sys.argv[1])
    except Exception as ex:
        logging.exception(str(ex))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
