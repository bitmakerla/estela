---
layout: page
title: Kafka
permalink: /cloud/kafka
parent: Bitmaker Cloud
---

# Bitmaker Cloud Kafka

Bitmaker Kafka contains all the configuration for the Kafka cluster on Kubernetes.
Currently, it allows upscaling and downscaling in both brokers and zookeepers.

For the transfer of items from Kafka to the Database, a capable script consumer.py was
created that performs this function.

## Local Setup

Locally, Kafka is run as a Docker service.

If it is the first time you build the app, you need to [set up the API locally]({% link bitmaker_cloud/api/local.md %}).
Then, do the following steps inside [`bitmaker-kafka/`](https://github.com/bitmakerla/bitmaker-cloud/tree/main/bitmaker-kafka):

- Create a new file `kubernetes/bitmaker-kafka-secrets.yaml` based on `kubernetes/bitmaker-kafka-secrets.yaml.example`.
  Then, modify the file with the appropriate values:
  - **\<MONGO_CONNECTION_BASE_64\>**: An active connection to a mongodb cluster formatted in base64.
  
- Check that the Endpoint ip in the `bitmaker-kafka-services.yaml` file, and the
  `LISTENER_DOCKER_EXTERNAL` field in the `docker-compose.yaml` file are equal to:
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

## Deployment

First, you need to [deploy the API]({% link bitmaker_cloud/api/api.md %}). Then, take the following steps:

- Create a new file `kubernetes/bitmaker-kafka-secrets.yaml` based on `kubernetes/bitmaker-kafka-secrets.yaml.example`.
  Then, modify the file with the appropriate values:
  - **\<MONGO_CONNECTION_BASE_64\>**: An active connection to a mongodb cluster formatted in base64.
  
- Apply the secrets:
  ```bash
  $ kubectl apply -f kubernetes/bitmaker-kafka-secrets.yaml
  ```

- The building and uploading of the images will be done by the GitLab CI/CD job.
  As well as the deployment to the kubernetes cluster.

## Upload Images to the Registry

```bash
$ make build-consumer-image
$ make upload-consumer-image
```

## Formatting

```bash
$ make lint
```
