---
layout: page
title: API
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

These components have a corresponding Docker config file to build their images
and run in Docker containers.

## Prerequisites
- Minikube v1.22.0
- Docker v20.10.7 (include docker-compose)
- aws-cli v2.2.18
- Python v3.6
