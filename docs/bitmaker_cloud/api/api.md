---
layout: page
title: API
permalink: /cloud/api
nav_order: 2
parent: Bitmaker Cloud
has_children: true
has_toc: false
---

# Bitmaker Cloud API

The Bitmaker Cloud API consists of three main components:

- `bitmaker-django-api`: The django app from which requests are handled.
- `bitmaker-celery-worker` and `bitmaker-celery-beat`: Responsible for executing the tasks and periodic tasks ordered by the API.
- `bitmaker-redis`: Keeps a record of the tasks and periodic tasks to be executed.

All of these components have a corresponding docker config file to build their images
and run in docker containers.

## Prerequisites
- Minikube v1.22.0
- Docker v20.10.7 (include docker-compose)
- aws-cli v2.2.18
- Python v3.6

## Set up an AWS ECR Container Registry

Registry and Repository can be manually created in [AWS ECR](https://aws.amazon.com/ecr/).

## Upload Images to the Registry

You need to configure the aws client. Check [the official guide](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html) for more information.

```bash
$ make build-all-images
$ make upload-all-images
```

## Update Migrations

```sh
$ make makemigrations
```

## Access Django Admin

The Django Admin is running in `<DJANGO_API_HOST>/admin`.
Log in with your user (superuser) credentials.

## Testing

```sh
$ make test
```

## Docs

It is important to run the `docs` command every time views, serializers and/or models
are modified to obtain the api.yaml that will be used in the `bitmaker-web` module.

```sh
$ make docs
```

## Formatting

```sh
$ make lint
```
