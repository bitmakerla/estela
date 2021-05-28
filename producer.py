import os
from json import dumps
from kafka import KafkaProducer


def connect_kafka_producer():
    _producer = None
    bootstrap_server = [
        '{}:{}'.format(os.getenv('KAFKA_ADVERTISED_HOST_NAME', 'localhost'),
                       os.getenv('KAFKA_ADVERTISED_PORT', '9092'))
    ]
    try:
        _producer = KafkaProducer(bootstrap_servers=bootstrap_server,
                                  value_serializer=lambda x: dumps(x).encode('utf-8'))
    except Exception as ex:
        print('Exception while connecting Kafka')
        print(str(ex))
    finally:
        return _producer


producer = connect_kafka_producer()

for e in range(10):
    data = {'number': str(e)}
    producer.send('spider-items', value=data)
    producer.flush()
