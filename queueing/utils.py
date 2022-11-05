import os
import json
import logging

from kafka import KafkaConsumer, KafkaProducer


def get_bootstrap_servers():
    kafka_advertised_port = os.getenv("KAFKA_ADVERTISED_PORT", "9092")
    kafka_advertised_listeners = os.getenv("KAFKA_ADVERTISED_LISTENERS").split(",")
    bootstrap_servers = [
        "{}:{}".format(kafka_advertised_listener, kafka_advertised_port)
        for kafka_advertised_listener in kafka_advertised_listeners
    ]
    return bootstrap_servers


def connect_kafka_consumer(topic_name, QUEUE_MAX_TIMEOUT):
    _consumer = None
    bootstrap_servers = get_bootstrap_servers()
    try:
        max_poll_interval_ms = (QUEUE_MAX_TIMEOUT + 1) * 1000
        print(max_poll_interval_ms)
        _consumer = KafkaConsumer(
            topic_name,
            bootstrap_servers=bootstrap_servers,
            auto_offset_reset="earliest",
            enable_auto_commit=True,
            auto_commit_interval_ms=1000,
            group_id="group_{}".format(topic_name),
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


def connect_kafka_producer():
    _producer = None
    bootstrap_servers = get_bootstrap_servers()
    try:
        _producer = KafkaProducer(
            bootstrap_servers=bootstrap_servers,
            value_serializer=lambda x: json.dumps(x).encode("utf-8"),
            acks=1,
            retries=1,
        )
    except Exception as ex:
        logging.error("Exception while connecting Kafka.")
        logging.error(str(ex))
    finally:
        return _producer


# https://stackoverflow.com/questions/12397118/mongodb-dot-in-key-name
def jsonify(item):
    new_item = {}
    if type(item) is dict:
        for key, value in item.items():
            new_key = key.replace(".", "\\u002e")
            if type(value) is dict:
                new_item[new_key] = jsonify(value)
            elif type(value) is list:
                new_item[new_key] = [jsonify(x) for x in value]
            else:
                new_item[new_key] = item[key]
        return new_item
    else:
        return item
