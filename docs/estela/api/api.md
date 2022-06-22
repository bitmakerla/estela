---
layout: page
title: API
nav_order: 2
parent: Estela
has_children: true
has_toc: false
---

# Estela API

The Estela API consists of three main components:

- `estela-django-api`: The django app from which requests are handled.
- `estela-celery-worker` and `estela-celery-beat`: Responsible for executing the tasks and periodic tasks ordered by the API.
- `estela-redis`: Keeps a record of the tasks and periodic tasks to be executed.

These components have a corresponding Docker config file to build their images
and run in Docker containers.

## Prerequisites
- Minikube v1.22.0
- Docker v20.10.7 (include docker-compose)
- aws-cli v2.2.18
- Python v3.6.x
