---
layout: page
title: Kafka
permalink: /cloud/kafka/
parent: Bitmaker Cloud
---

# Bitmaker Cloud Kafka

Bitmaker Kafka contains all the configuration for the Kafka cluster on Kubernetes.
Currently it allows up-scaling and down scaling in both brokers and zookeepers.

For the passage of items from kafka to the Database, a capable script consumer.py was
created that performs this function.

<h2> Local Set-up </h2>

Locally, Kafka is run as a Docker service.

If it is the first time you build the app, you need to [set up locally the API](https://gitlab.com/bitmakerla/dev/bitmaker-scraping-product#local-setup), then, do the following steps:

- Create a new file `bitmaker-kafka-secrets.yaml` based on `bitmaker-kafka-secrets.yaml.example`. Then, modify the file with the appropriate values:
  - `<MONGO_CONNECTION_BASE_64>`: An active connection to a mongodb cluster formatted in base64.
  
- Check that the Endpoint ip in the `bitmaker-kafka-services.yaml` file, and the `LISTENER_DOCKER_EXTERNAL` field in the `docker-compose.yaml` file are equal to:
  ```
  $ minikube ssh 'grep host.minikube.internal /etc/hosts | cut -f1'
  ```
  
- Apply the setup command, which build and upload the images, and apply all the kubernetes `yaml` files:
  ```bash
  $ make setup
  ```

<h3> Commands </h3>

After the first setup, you can:
```bash
$ make start    # Start the kafka service
$ make stop     # Stop the kafka service
$ make rebuild  # Rebuild the kafka consumer
$ make down     # Delete the kafka service
```

<h2> Deployment </h2>

First, you need to [deploy the API](https://gitlab.com/bitmakerla/dev/bitmaker-scraping-product#deployment), then, do the following steps:

- Create a new file `bitmaker-kafka-secrets.yaml` based on `bitmaker-kafka-secrets.yaml.example`. Then, modify the file with the appropriate values:
  - `<MONGO_CONNECTION_BASE_64>`: An active connection to a mongodb cluster formatted in base64.
  
- Apply the secrets:
  ```bash
  $ kubectl apply -f kubernetes/prod/bitmaker-kafka-secrets.yaml
  ```

- The building and uploading of the images will be done by the GitLab CI/CD job. As well as the deployment to the kubernetes cluster.

<h2> Upload Images to the Registry </h2>

```bash
$ make build-consumer-image
$ make upload-consumer-image
```

<h2> Formatting </h2>

```bash
$ make lint
```
