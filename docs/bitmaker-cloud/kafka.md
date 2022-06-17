---
layout: page
title: Kafka
parent: Bitmaker Cloud
---

# Bitmaker Cloud Kafka

The project uses a Kafka cluster as its scheduler to transport scraped items into the database. This module contains
all the configurations for the Kafka cluster on Kubernetes. It currently allows upscaling and downscaling in brokers
and zookeepers.

The script [`consumer.py`](https://github.com/bitmakerla/bitmaker-cloud/blob/main/bitmaker-kafka/consumer.py)
was created to perform the task of transporting items from Kafka to the database.

## Local Setup

Locally, Kafka is run as a Docker service.

If it is the first time you build the app, you need to [set up the API locally]({% link bitmaker-cloud/api/local.md %}).
Then, take the following steps inside [`bitmaker-kafka/`](https://github.com/bitmakerla/bitmaker-cloud/tree/main/bitmaker-kafka):

- Create a `Makefile` using the `Makefile.example` file in `bitmaker-kafka/`.

- Create a new file `kubernetes/bitmaker-kafka-secrets.yaml` based on `kubernetes/bitmaker-kafka-secrets.yaml.example`.
  Then, modify the file with the appropriate values:
  - **\<MONGO_CONNECTION_BASE_64\>**: An active connection to a MongoDB cluster formatted in _base64_.
  
- Check that the endpoint IP in the `kubernetes/bitmaker-kafka-services.yaml` file, the
  `LISTENER_DOCKER_EXTERNAL` field in the `docker-compose.yaml` file, and the IPs of the images' names
  in `kubernetes/bitmaker-kafka-consumers.yaml` are equal to:
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
