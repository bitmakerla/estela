# Bitmaker Scraping Product - Kafka deployments

[![Code style: black](https://img.shields.io/badge/code%20style-black-000000.svg)](https://github.com/psf/black)

## Requirements

- Install python dependencies:
  ```bash
  $ pip install -r requirements/consumer.txt
  ```

## Local Set-up

If it is the first time you build the app, you need to [set up locally the API](https://gitlab.com/bitmakerla/dev/bitmaker-scraping-product#local-setup), then, do the following steps:

- Create a new file _bitmaker-kafka-secrets.yaml_ based on _bitmaker-kafka-secrets.yaml.example_. Then, modify the file with the appropriate values:
  - _<MONGO\_CONNECTION\_BASE\_64>_: An active connection to a mongodb cluster formatted in base64.
  
- Apply the setup command, which build and upload the images, and apply all the kubernetes _yaml_ files:
  ```bash
  $ make setup
  ```

After the first setup, you can:
```bash
$ make start    # Start the kafka service
$ make stop     # Stop the kafka service
$ make rebuild  # Rebuild the kafka consumer
$ make down     # Delete the kafka service
```

## Deployment

First, you need to [deploy the API](https://gitlab.com/bitmakerla/dev/bitmaker-scraping-product#deployment), then, do the following steps:

- Create a new file _bitmaker-kafka-secrets.yaml_ based on _bitmaker-kafka-secrets.yaml.example_. Then, modify the file with the appropriate values:
  - _<MONGO\_CONNECTION\_BASE\_64>_: An active connection to a mongodb cluster formatted in base64.
  
- Apply the Secrets:
  ```bash
  $ kubectl apply -f kubernetes/prod/bitmaker-kafka-secrets.yaml
  ```

- The building and uploading of the images will be done by the GitLab CI/CD job. As well as the deployment to the kubernetes cluster.

## Upload Images to the Registry

```bash
$ make build-consumer-image
$ make upload-consumer-image
```

## Formatting

```bash
$ make lint
```
