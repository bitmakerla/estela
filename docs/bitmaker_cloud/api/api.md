---
layout: page
title: API
permalink: /cloud/api/
nav_order: 2
parent: Bitmaker Cloud
has_children: true
---

# Bitmaker Cloud API

The Bitmaker Cloud API consists of three main components:

- `bitmaker-django-api`: The django app from which requests are handled.
- `bitmaker-celery-worker` and `bitmaker-celery-beat`: Responsible for executing the tasks and periodic tasks ordered by the API.
- `bitmaker-redis`: Keeps a record of the tasks and periodic tasks to be executed.
All these components have a corresponding docker config file to build their images and run in docker containers.

## Prerequisites
- Minikube v1.22.0
- Docker v20.10.7 include docker-compose
- aws-cli v2.2.18
- Python v3.6

<h2> Update Migrations </h2>

```sh
$ make makemigrations
```

<h2> Access Django Admin </h2>

Django Admin is running in `<DJANGO_API_HOST>/admin`,
login with your user (superuser) credentials.


<h2> Set-up AWS ECR Container Registry </h2>

Registry and Repository can be manually created in [AWS ECR](https://aws.amazon.com/ecr/).

<h2> Upload Images to the Registry </h2>

You need to configure the aws client. Check [the official guide](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html) for more information.

```bash
$ make build-all-images
$ make upload-all-images
```

<h2> Testing </h2>

```sh
$ make test
```

<h2> Docs </h2>

It is important to run the `docs` command every time views, serializers and/or models are modified to obtain the api.yaml that will be used in bitmaker-web module.

```sh
$ make docs
```

<h2> Formatting </h2>

```sh
$ make lint
```
