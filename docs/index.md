---
layout: home
title: Overview
nav_order: 1
---

# Bitmaker Cloud Documentation

## Overview
[Bitmaker Cloud](https://github.com/bitmakerla/bitmaker-cloud) is an open-source elastic web scraping cluster created by
[Bitmaker](https://www.bitmaker.la/). Clients and users interested in web scraping can orchestrate and run their
spiders (e.g., Scrapy spiders) in an infrastructure that lets them monitor and manage their projects more effortlessly,
similar to [Scrapy Cloud](https://bitmaker.la/docs/bitmaker-cloud/api/engines.html). Bitmaker Cloud aims to be versatile,
to the point that you can deploy it in-home.

The [Bitmaker CLI](https://github.com/bitmakerla/bitmaker-cli/) is in charge of Scrapy based projects deployment
(currently only supports Scrapy projects) and uses a REST API client to upload projects. These projects are then built
into docker images and added to a Docker Registry.

The [Bitmaker API]({% link bitmaker-cloud/api/api.md %}) endpoint creates a [Kubernetes](https://kubernetes.io/) job
to complete every spider job (it could also be a spider cronjob). Currently, Bitmaker Cloud only works with Kubernetes.
However, you can [add your engine](https://www.zyte.com/scrapy-cloud/) to make it work with Docker or other engines.
Jobs send spider jobs data to [Kafka](https://kafka.apache.org/) brokers through extensions and middlewares
implemented in the [entry point]({% link bitmaker-entrypoint/index.md %}). Kafka consumers read the information and send
data to a data storage (e.g., [MongoDB](https://www.mongodb.com/)).

## Architecture

![Bitmaker Cloud Architecture](./assets/images/architecture.svg)

## Structure
- [Bitmaker Cloud](https://github.com/bitmakerla/bitmaker-cloud/): It is composed of three modules that work
  independently, and can be changed. E.g., use RabbitMQ instead of Kafka as its queueing system.
  - [API](https://github.com/bitmakerla/bitmaker-cloud/tree/main/bitmaker-api): Implements a REST API built
    with the Django REST framework toolkit, which exposes several endpoints to manage projects, spiders, and jobs. It
    uses Celery for task processing and takes care of deploying your Scrapy projects, among other things.
  - [Queueing](https://github.com/bitmakerla/bitmaker-cloud/tree/main/bitmaker-kafka): Estela needs a high-throughput,
    low-latency platform that controls real-time data feeds in a producer-consumer architecture. In this module, you
    will find a Kafka consumer and the configuration to set up the Kafka cluster used to collect and transport the
    information from the spiders into a database.
  - [Web](https://github.com/bitmakerla/bitmaker-cloud/tree/main/bitmaker-web): A front-end project implemented
    with React Framework (with Ant Design) and Typescript. This module implements a user-friendly environment that
    communicates with the API and lets you manage your spiders and scraping projects.
- [Bitmaker Cloud CLI](https://github.com/bitmakerla/bitmaker-cli/): This is the command line client to interact with
    Bitmaker Cloud API. It allows you to create projects and deploy them to Estela, as well as create jobs, cronjobs, etc.
- [Bitmaker Entrypoint](https://github.com/bitmakerla/bitmaker-entrypoint): This is a package that implements a wrapper layer to extract job
    data from the environment, prepare the job properly, and execute it using Scrapy.

## Get Started
From here, we recommend reading through the following docs:

- Set up the [Bitmaker Cloud API]({% link bitmaker-cloud/api/api.md %}).
- [Install the Bitmaker CLI]({% link bitmaker-cli/install.md %}).
