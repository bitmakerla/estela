import os
import sys
import json
import pymongo
import logging
import threading

from queue import Queue
from kafka import KafkaConsumer


DEFAULT_WORKER_POOL = 10
item_queue = Queue()


def connect_kafka_consumer(topic_name):
    _consumer = None
    bootstrap_server = [
        '{}:{}'.format(
            os.getenv('KAFKA_ADVERTISED_HOST_NAME', 'localhost'),
            os.getenv('KAFKA_ADVERTISED_PORT', '9092')
        )
    ]
    try:
        _consumer = KafkaConsumer(
            topic_name,
            bootstrap_servers=bootstrap_server,
            auto_offset_reset='earliest',
            enable_auto_commit=True,
            group_id='group_{}'.format(topic_name),
            api_version=(0, 10),
            value_deserializer=lambda x: json.loads(x.decode('utf-8'))
        )
    except Exception as ex:
        logging.error('Exception while connecting Kafka')
        logging.error(str(ex))
    finally:
        return _consumer


def read_from_queue(client):
    while True:
        item = item_queue.get()
        client[item['database_name']][item['collection_name']].insert_one(item['payload'])
        logging.info('Document inserted')
        item_queue.task_done()


def consume_from_kafka(topic_name, worker_pool):
    try:
        client = pymongo.MongoClient(os.getenv('MONGO_CONNECTION', 'localhost'))
        logging.info('DB connection established')
    except:
        logging.error('Could not connect to the DB')
        return

    consumer = connect_kafka_consumer(topic_name)
    workers = []
    for i in range(worker_pool):
        worker = threading.Thread(target=read_from_queue, args=(client,), daemon=True)
        worker.start()
        workers.append(worker)

    for message in consumer:
        item_queue.put({
            'payload': message.value['payload'],
            'database_name': message.value['jid'],
            'collection_name': topic_name,
        })

    item_queue.join()
    consumer.close()
    client.close()


def main():
    logging.basicConfig(level=logging.INFO)
    try:
        worker_pool = int(sys.argv[2]) if len(sys.argv) == 3 else DEFAULT_WORKER_POOL
        consume_from_kafka(sys.argv[1], worker_pool)
    except Exception as ex:
        logging.error(str(ex))
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
