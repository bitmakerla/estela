import os
import sys
import json
import pymongo
import logging

from kafka import KafkaConsumer


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


def consume_from_kafka(topic_name):
    try:
        client = pymongo.MongoClient(os.getenv('MONGO_CONNECTION', 'localhost'))
        logging.info('DB connection established')
    except:
        logging.error('Could not connect to the DB')
        return

    consumer = connect_kafka_consumer(topic_name)

    for message in consumer:
        message_value = message.value
        collection = client[message_value['jid']][topic_name]
        collection.insert_one(message_value['payload'])
        logging.info("Document inserted in '{}'".format(topic_name))

    consumer.close()
    client.close()


def main():
    logging.basicConfig(level=logging.INFO)
    try:
        consume_from_kafka(sys.argv[1])
    except Exception as ex:
        logging.error(str(ex))
        logging.error('The consumer topic must be specified')
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
