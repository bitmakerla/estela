<h1 align="center">Estela Kafka Queueing</h1>

[![Code style: black](https://img.shields.io/badge/code%20style-black-000000.svg)](https://github.com/psf/black)

The project uses a Kafka cluster as its scheduler to transport scraped items into the database. This module contains
all the configurations for the Kafka cluster on Kubernetes. It currently allows upscaling and downscaling in brokers
and zookeepers.

The script `consumer.py` was created to perform the task of transporting items from Kafka to the database.

<h2>Requirements</h2>

- Install python dependencies:
  ```bash
  $ pip install -r requirements/consumer.txt
  ```

<h2>Setup</h2>

For a detailed description of how to set up your Kafka cluster, please check out our
[official documentation](https://bitmaker.la/docs/bitmaker-cloud/kafka.html).
