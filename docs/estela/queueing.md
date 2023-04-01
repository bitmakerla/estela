---
layout: page
title: Queueing
parent: estela
---

# Queueing

estela needs a high-throughput, low-latency platform that controls real-time data feeds in a producer-consumer architecture.
Currently, estela uses Kafka to collect, transport and consume the information from the spiders into a database.

## estela Queue Adapter

It is a [python project](https://github.com/bitmakerla/estela-queue-adapter) that provides a clean support to different queuing platforms for estela.

### Usage

The estela Queue Adapter provides a clean interface for queueing consumer and producer objects.
It can be configured via environmental variables, these three variables are always required:

* `QUEUE_PLATFORM`: One of the supported platforms, currently we only support `kafka`.
* `QUEUE_PLATFORM_LISTENERS`: List of the queuing advertised hosts in a comma-separated style.
* `QUEUE_PLATFORM_PORT`: The port number of the aforementioned listeners.

{: .note }
> You can also pass the constructor parameters directly, overwriting the environmental values. The variable name is the lower-cased text after the `QUEUE_PLATFORM` prefix.

### Supported Platforms

#### Kafka

To configure the Kafka producer, only the three main variables are required.
To configure the Kafka consumer declare the following additional environmental variables:

* `QUEUE_PLATFORM_TOPIC`: The name of the topic to subscribe.
* `QUEUE_PLATFORM_MAX_TIMEOUT`: Maximum timeout in seconds to process a message batch.

Once all the environmental variables are set, you can instantiate the producer and consumer objects.

```python
from estela_queue_adapter import get_producer_interface, get_consumer_interface

producer = get_producer_interface()
consumer = get_consumer_interface(topic="people_topic")

producer.get_connection()
consumer.get_connection()

producer.send("people_topic", {"name": "John", "lastname": "Doe"})
for message in consumer:
	print(message.value)
```

## Queuing Flow

In the following image, we can see the critical part played by the queuing platform, currently Kafka. 
In the entrypoint, the spiders are customized using a Scrapy Extension to send their extracted items and requests to the queuing platform. 
Which takes care of queueing these items, ensuring their arrival to the estela Consumer.

![estela Kafka Flow](../assets/images/kafka_flow.svg)

estela currently works with Kafka thanks to its great functionality, but it will soon be extended to work with other queueing systems.

## The estela Consumer 

The [estela consumer module](https://github.com/bitmakerla/estela/blob/main/queueing){:target="_blank"} 
was created to perform the task of transporting items from the Queuing platform to the database.
It avoids possible database overloads by politely inserting the scraped items in chunks,
and ensures their insertion by handling database and connection errors in a controlled and efficient manner.
