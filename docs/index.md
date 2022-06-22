---
layout: home
title: Overview
nav_order: 1
---

# Estela Documentation

## Overview
[Estela](https://github.com/bitmakerla/estela) is an open-source application created by
[Bitmaker](https://www.bitmaker.la/). Clients and users interested in web scraping can orchestrate and run their
spiders (e.g., Scrapy spiders), similar to [Zyte](https://www.zyte.com/)'s
[Scrapy Cloud](https://www.zyte.com/scrapy-cloud/). Estela aims to be versatile, to the point that you can
deploy it in-home.

The [Estela CLI](https://github.com/bitmakerla/estela-cli/) is in charge of Scrapy based projects deployment
(currently only supports Scrapy projects) and uses a REST API client to upload projects. These projects are then built
into docker images and added to a Docker Registry.

The [Estela API]({% link estela/api/api.md %}) endpoint creates a [Kubernetes](https://kubernetes.io/) job
to complete every spider job (it could also be a spider cronjob). Currently, Estela only works with Kubernetes.
However, you can [add your engine](https://www.zyte.com/scrapy-cloud/) to make it work with Docker or other engines.
Jobs send spider jobs data to [Kafka](https://kafka.apache.org/) brokers through extensions and middlewares
implemented in the [entry point]({% link estela-entrypoint/index.md %}). Kafka consumers read the information and send
data to a data storage (e.g., [MongoDB](https://www.mongodb.com/)).

## Architecture

![Estela Architecture](./assets/images/architecture.svg)

## Structure
- [Estela](https://github.com/bitmakerla/estela/): It is composed of modules that work independently of the rest, and
  can be changed. E.g., use RabbitMQ instead of Kafka.
  - [Estela API](https://github.com/bitmakerla/estela/tree/main/estela-api): It contains everything related to
    the API of the product. It manages the spiders.
  - [Estela Kafka](https://github.com/bitmakerla/estela/tree/main/estela-kafka): It contains everything related
    to the Kafka cluster used to collect and transport the information of the spiders.
  - [Estela Web](https://github.com/bitmakerla/estela/tree/main/estela web): It contains everything related to the
    front end of the product. You can manage the spiders with a user-friendly interface from here.
- [Estela CLI](https://github.com/bitmakerla/estela-cli/): This is the command line client to interact with Estela API.
- [Estela Entrypoint](https://github.com/bitmakerla/estela-entrypoint): This is a package that implements a wrapper layer to extract job
    data from the environment, prepare the job properly, and execute it using Scrapy.

## Get Started
From here, we recommend reading through the following docs:

- Set up the [Estela API]({% link estela/api/api.md %}).
- [Install the Estela CLI]({% link estela-cli/install.md %}).
