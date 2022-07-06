---
layout: page
title: Queueing
parent: estela
---

# Queueing

estela needs a high-throughput, low-latency platform that controls real-time data feeds in a producer-consumer
architecture. In this module, you will find a Kafka consumer used to collect and transport the information from the
spiders into a database.

## Kafka

The project uses a Kafka cluster as its scheduler to transport scraped items into the database. The script
[`consumer.py`](https://github.com/bitmakerla/estela/blob/main/queueing/consumer.py)
was created to perform the task of transporting items from Kafka to the database.

All the configurations for the Kafka cluster on Kubernetes are also provided in the project, allowing upscaling and
downscaling in brokers and zookeepers.

## Kafka Flow

In the following image, we can see the critical part played by Kafka. In the entry point, the spiders are customized
using a Scrapy Extension to send their extracted items and requests to Kafka. Kafka takes care of queueing these items
to avoid possible database overload, politely inserting these items.

![estela Kafka Flow](../assets/images/kafka_flow.svg)

estela currently works tightly with Kafka thanks to its great functionality, but may be extended to work with other
queueing systems.
