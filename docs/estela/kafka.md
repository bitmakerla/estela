---
layout: page
<<<<<<< HEAD:docs/bitmaker-cloud/kafka.md
title: Queueing
parent: Bitmaker Cloud
=======
title: Kafka
parent: Estela
>>>>>>> BITMAKER-1804: Rename Bitmaker Cloud to Estela:docs/estela/kafka.md
---

# Estela Kafka

<<<<<<< HEAD:docs/bitmaker-cloud/kafka.md
The project uses a Kafka cluster as its scheduler to transport scraped items into the database. This module contains
all the configurations for the Kafka cluster on Kubernetes. It currently allows upscaling and downscaling in brokers
and zookeepers.

The script [`consumer.py`](https://github.com/bitmakerla/bitmaker-cloud/blob/main/bitmaker-kafka/consumer.py)
was created to perform the task of transporting items from Kafka to the database.


## Estela Kafka Flow

In the following image, we can see the critical part played by Kafka. In the entry point, the spiders are customized
using a  Scrapy Extension to send their extracted items and requests to Kafka. Kafka takes care of queueing these items
to avoid possible database overload, politely inserting these items.

![Estela Kafka Flow](../assets/images/kafka_flow.svg)

Estela currently works tightly with Kafka thanks to its great functionality, but may be extended to work with other
queueing systems.
=======
Estela Kafka contains all the configurations for the Kafka cluster on Kubernetes.
Currently, it allows upscaling and downscaling in both brokers and zookeepers.

The script [`consumer.py`](https://github.com/bitmakerla/estela/blob/main/estela-kafka/consumer.py)
was created to transfer items from Kafka to the database.

## Local Setup

Locally, Kafka is run as a Docker service.

If it is the first time you build the app, you need to [set up the API locally]({% link estela/api/local.md %}).
Then, take the following steps inside [`estela-kafka/`](https://github.com/bitmakerla/estela/tree/main/estela-kafka):

- Create a `Makefile` using the `Makefile.example` file in `estela-kafka/`.

- Create a new file `kubernetes/estela-kafka-secrets.yaml` based on `kubernetes/estela-kafka-secrets.yaml.example`.
  Then, modify the file with the appropriate values:
  - **\<MONGO_CONNECTION_BASE_64\>**: An active connection to a MongoDB cluster formatted in _base64_.
  
- Check that the endpoint IP in the `kubernetes/estela-kafka-services.yaml` file, the
  `LISTENER_DOCKER_EXTERNAL` field in the `docker-compose.yaml` file, and the IPs of the images' names
  in `kubernetes/estela-kafka-consumers.yaml` are equal to:
  ```bash
  $ minikube ssh 'grep host.minikube.internal /etc/hosts | cut -f1'
  ```
  
- Apply the setup command, which build and upload the images, and apply all the kubernetes `yaml` files:
  ```bash
  $ make setup
  ```

### Commands

After the first setup, you can:
```bash
$ make start    # Start the Kafka service
$ make stop     # Stop the Kafka service
$ make rebuild  # Rebuild the Kafka consumer
$ make down     # Delete the Kafka service
```

## Upload Images to the Registry

```bash
$ make build-consumer-image
$ make upload-consumer-image
```

## Formatting

```bash
$ make lint
```
>>>>>>> BITMAKER-1804: Rename Bitmaker Cloud to Estela:docs/estela/kafka.md
