---
layout: page
title: API
nav_order: 2
parent: Bitmaker Cloud
has_children: true
has_toc: false
---

# Bitmaker Cloud API

The API consists of three main components:
- Django API: Implements a REST API built with the Django REST framework toolkit, exposing several endpoints to manage
    projects, spiders, and jobs.
- Celery worker and beat: Responsible for executing the tasks and periodic tasks ordered by the API.
- Redis: Keeps a record of the tasks and periodic tasks to be executed.  It is needed by Celery.

These components have a corresponding Docker config file to build their images
and run in Docker containers.

## Prerequisites
- Minikube v1.22.0
- Docker v20.10.7 (include docker-compose)
- aws-cli v2.2.18
- Python v3.6.x
