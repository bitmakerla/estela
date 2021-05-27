import os
from kafka import KafkaConsumer
from json import loads
import pymongo


def connect_kafka_consumer(topic_name):
    _consumer = None
    bootstrap_server = [
        '{}:{}'.format(os.getenv('KAFKA_ADVERTISED_HOST_NAME', 'localhost'),
                       os.getenv('KAFKA_ADVERTISED_PORT', '9092'))
    ]
    try:
        _consumer = KafkaConsumer(topic_name, bootstrap_servers=bootstrap_server, auto_offset_reset='earliest',
                                  enable_auto_commit=True, value_deserializer=lambda x: loads(x.decode('utf-8')))
    except Exception as ex:
        print('Exception while connecting Kafka')
        print(str(ex))
    finally:
        return _consumer


client = pymongo.MongoClient(os.getenv('MONGO_CONNECTION', 'localhost'))
collection = client['bitmaker']['collection']

consumer = connect_kafka_consumer('spider-items')

for message in consumer:
    message_value = message.value
    collection.insert_one(message_value)

consumer.close()
