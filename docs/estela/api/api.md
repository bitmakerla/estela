---
layout: page
title: API
nav_order: 2
parent: estela
has_children: true
has_toc: false
---

# estela API

The estela API consists of three main components:

- `estela-django-api`: The REST API built with the Django REST Framework toolkit.
- `estela-celery-worker` and `estela-celery-beat`: Responsible for executing asynchronous tasks and periodic tasks
    ordered by the API.
- `estela-redis`: Keeps a record of the tasks and periodic tasks to be executed. Used as a message broker by
    the `estela-celery-worker` and `estela-celery-beat` components.

These components have a corresponding Docker config file to build their images and run in Docker containers.

## Prerequisites
- Minikube v1.22.0
- Docker v20.10.7 (include docker-compose)
- aws-cli v2.2.18
- Python v3.6.x
