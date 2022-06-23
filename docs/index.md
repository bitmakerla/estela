---
layout: home
title: Overview
nav_order: 1
---

# estela Documentation

## Overview
[estela](https://github.com/bitmakerla/estela) is an open-source application created by
[Bitmaker](https://www.bitmaker.la/). Clients and users interested in web scraping can orchestrate and run their
spiders (e.g., Scrapy spiders), similar to [Zyte](https://www.zyte.com/)'s
[Scrapy Cloud](https://www.zyte.com/scrapy-cloud/). estela aims to be versatile, to the point that you can
deploy it in-home.

The [estela CLI](https://github.com/bitmakerla/estela-cli/) is in charge of Scrapy based projects deployment
(currently only supports Scrapy projects) and uses a REST API client to upload projects. These projects are then built
into docker images and added to a Docker Registry.

The [estela API]({% link estela/api/api.md %}) endpoint creates a [Kubernetes](https://kubernetes.io/) job
to complete every spider job (it could also be a spider cronjob). Currently, estela only works with Kubernetes.
However, you can [add your engine](https://www.zyte.com/scrapy-cloud/) to make it work with Docker or other engines.
Jobs send spider jobs data to [Kafka](https://kafka.apache.org/) brokers through extensions and middlewares
implemented in the [entry point]({% link estela-entrypoint/index.md %}). Kafka consumers read the information and send
data to a data storage (e.g., [MongoDB](https://www.mongodb.com/)).

## Architecture

![estela Architecture](./assets/images/architecture.svg)

## Structure
- [estela](https://github.com/bitmakerla/estela/): It is composed of modules that work independently of the rest, and
  can be changed. E.g., use RabbitMQ instead of Kafka.
  - [REST API](https://github.com/bitmakerla/estela/tree/main/estela-api): Built with the Django REST framework toolkit,
    which exposes several endpoints to manage projects, spiders, and jobs. It uses Celery for task processing and takes
    care of deploying your Scrapy projects, among other things.
  - [Queueing](https://github.com/bitmakerla/estela/tree/main/queueing): estela needs a high-throughput, low-latency
    platform that controls real-time data feeds in a producer-consumer architecture. In this module, you will find a
    Kafka consumer used to collect and transport the information from the spiders into a database.
  - [Web](https://github.com/bitmakerla/estela/tree/main/estela-web): A front-end project implemented with React
    Framework (with Ant Design) and Typescript. This module implements a user-friendly environment that communicates
    with the API and lets you manage your spiders and scraping projects.
- [estela CLI](https://github.com/bitmakerla/estela-cli/): This is the command line client to interact with estela API.
- [estela Entrypoint](https://github.com/bitmakerla/estela-entrypoint): This is a package that implements a wrapper layer to extract job
    data from the environment, prepare the job properly, and execute it using Scrapy.

## Get Started
From here, we recommend reading through the following docs:

- Set up the [estela API]({% link estela/api/api.md %}).
- [Install the estela CLI]({% link estela-cli/install.md %}).
