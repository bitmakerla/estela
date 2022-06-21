---
layout: page
title: Kafka
parent: Bitmaker Cloud
---

# Estela Kafka

The project uses a Kafka cluster as its scheduler to transport scraped items into the database. This module contains
all the configurations for the Kafka cluster on Kubernetes. It currently allows upscaling and downscaling in brokers
and zookeepers.

The script [`consumer.py`](https://github.com/bitmakerla/bitmaker-cloud/blob/main/bitmaker-kafka/consumer.py)
was created to perform the task of transporting items from Kafka to the database.


## Estela Kafka Flow

In the following image, we can see the critical part played by Kafka. In the entry point, the spiders are customized
using a  Scrapy Extension to send their extracted items and requests to Kafka. Kafka takes care of queueing these items
to avoid possible database overload, politely inserting these items.

![Bitmaker Cloud Architecture](../assets/images/kafka_flow.svg)

Estela currently works tightly with Kafka thanks to its great functionality, but may be extended to work with other
queueing systems.
