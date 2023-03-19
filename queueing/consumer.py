import os
import sys
import logging
import threading
import time

from queue import Queue
from config.database_manager import db_client
from inserter import Inserter
from utils import jsonify
from estela_queue_adapter import get_consumer_interface


WORKER_POOL = int(os.getenv("WORKER_POOL", "10"))
HEARTBEAT_TICK = int(os.getenv("HEARTBEAT_TICK", "300"))
QUEUE_BASE_TIMEOUT = int(os.getenv("QUEUE_BASE_TIMEOUT", "5"))
QUEUE_MAX_TIMEOUT = int(os.getenv("QUEUE_MAX_TIMEOUT", "300"))

item_queue = Queue()
inserters = {}
heartbeat_lock = threading.Lock()


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
            for inserter in inserters.values():
                inserter.flush("empty queue")
            continue

        item = jsonify(item)
        inserters[item["identifier"]].insert(item["value"])
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

            for identifier in list(inserters):
                inserters[identifier].flush("heartbeat")
                if (
                    inserters[identifier].is_inactive()
                    and not inserters[identifier].has_pending_items()
                ):
                    del inserters[identifier]

            logging.debug("Heartbeat: {} alive inserters.".format(len(inserters)))


def consume_from_queue_platform(topic_name):
    if db_client.get_connection():
        logging.info("DB: connection established.")
    else:
        raise Exception("Could not connect to the DB.")

    consumer = get_consumer_interface(
        topic=topic_name, max_timeout=str(QUEUE_MAX_TIMEOUT)
    )
    if consumer.get_connection():
        logging.info("Queue platform: connection established.")
    else:
        raise Exception("Could not connect to the queue platform.")

    _heartbeat = threading.Thread(target=heartbeat, daemon=True)
    _heartbeat.start()

    for message in consumer:
        if heartbeat_lock.locked():
            heartbeat_lock.acquire()
            heartbeat_lock.release()

        job, spider, project = message.value["jid"].split(".")

        collection_name = "{}-{}-{}".format(spider, job, topic_name)
        identifier = "{}/{}".format(project, collection_name)
        unique = message.value.get("unique", "") == "True"

        if inserters.get(identifier) is None:
            inserters[identifier] = Inserter(
                db_client, project, collection_name, unique, topic_name
            )

        inserters[identifier].add_pending_item()
        item_queue.put({"identifier": identifier, "value": message.value})

    item_queue.join()
    consumer.close()


def main():
    logging.basicConfig(level=logging.INFO)
    try:
        consume_from_queue_platform(sys.argv[1])
    except Exception as ex:
        logging.exception(str(ex))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
