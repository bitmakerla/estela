import os
import sys
import json
import pymongo
import logging
import threading
import boto3
import botocore

from queue import Queue
from kafka import KafkaConsumer
from pymongo.errors import ConnectionFailure


DEFAULT_WORKER_POOL = 15
item_queue = Queue()

count = 0


def connect_kafka_consumer(topic_name):
    _consumer = None
    kafka_advertised_port = os.getenv("KAFKA_ADVERTISED_PORT", "9092")
    kafka_advertised_listeners = os.getenv("KAFKA_ADVERTISED_LISTENERS").split(",")
    bootstrap_servers = [
        "{}:{}".format(kafka_advertised_listener, kafka_advertised_port)
        for kafka_advertised_listener in kafka_advertised_listeners
    ]
    try:
        _consumer = KafkaConsumer(
            topic_name,
            bootstrap_servers=bootstrap_servers,
            auto_offset_reset="earliest",
            enable_auto_commit=True,
            auto_commit_interval_ms=3000,
            group_id="group_{}".format(topic_name),
            api_version=(0, 10),
            value_deserializer=lambda x: json.loads(x.decode("utf-8")),
        )
    except Exception as ex:
        logging.error("Exception while connecting Kafka")
        logging.error(str(ex))
    finally:
        return _consumer


def read_from_queue(client):
    while True:
        item = item_queue.get()
        try:
            client[item["database_name"]][item["collection_name"]].insert_one(
                item["payload"]
            )
            logging.debug("Document inserted {}.".format(item["collection_name"]))
        except:
            logging.warning(
                "An exception occurs during the insertion in: {}/{}.".format(
                    item["database_name"], item["collection_name"]
                )
            )
        item_queue.task_done()


def get_client(db_connection):
    try:
        if bool(os.getenv("PRODUCTION")):
            logging.info("--PRODUCTION--")
            client = pymongo.MongoClient(
                db_connection,
                tls=True,
                tlsCAFile="config/mongo_certificate/ca-certificate.crt",
            )
            client.admin.command("ismaster")
        else:
            logging.info("--LOCAL--")
            client = pymongo.MongoClient(db_connection)
    except ConnectionFailure:
        return None
    return client


def consume_from_kafka(topic_name, worker_pool):
    client = get_client(os.getenv("MONGO_CONNECTION"))
    if client:
        logging.debug("DB connection established")
    else:
        logging.error("Could not connect to the DB")
        return

    consumer = connect_kafka_consumer(topic_name)
    partitions = consumer.partitions_for_topic(topic_name)
    workers = []
    for i in range(worker_pool):
        worker = threading.Thread(target=read_from_queue, args=(client,), daemon=True)
        worker.start()
        workers.append(worker)

    for message in consumer:
        job, spider, project = message.value["jid"].split(".")
        item_queue.put(
            {
                "payload": message.value["payload"],
                "database_name": project,
                "collection_name": "{}-{}-{}".format(spider, job, topic_name),
            }
        )
    item_queue.join()
    consumer.close()
    client.close()


def main():
    logging.basicConfig(level=logging.INFO)
    try:
        worker_pool = int(sys.argv[2]) if len(sys.argv) == 3 else DEFAULT_WORKER_POOL
        consume_from_kafka(sys.argv[1], worker_pool)
    except Exception as ex:
        logging.exception(str(ex))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
