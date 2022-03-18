---
layout: page
title: Engines
permalink: /cloud/api/engines
parent: API
grand_parent: Bitmaker Cloud
---

# Engines

The project was thought to work in Kubernetes, but it is possible to run it in any other
orchestrator. The API handles everything with celery and models. You just need to define
an engine as a class that contains Job and Status inner classes according to your needs,
but respecting a base methods. Add your engine in engines/config.py with a name:
```py
def JobManager(engine):
    engines = {
        "kubernetes": KubernetesEngine,
        "your_engine": YourEngine,
    }

    return engines[engine]()
```

To use it, just define it in config/job_manager.py:
```py
job_manager = JobManager(engine="your_engine")
```

## Status

This class represents the status of the job, initially it must contain three attributes:

- **active**: A positive number if the job is active and None otherwise. E.g., in Kubernetes, how many pods are active.
- **succeed**: A positive number if the job succeeded and None otherwise. E.g., in Kubernetes, how many pods succeeded.
- **failed**: A positive number if the job failed and None otherwise. E.g., in Kubernetes, how many pods failed.

## Job

This class represents a job, initially it must contain two attributes:

- **name**: This could be a job name or job id, but must be a way to identify a job, e.g. job name in kubernetes or container name in Docker.
- **status**: A status object that represent the job status.

## Create your Engine

The `Engine` class controls the creation, deletion, and reading of jobs. Initially, it must have four methods:
- **create_job**: This function must contain the logic about how a job should be create. E.g., Kubernetes Job or Docker Container. Must return a Job Object.
- **delete_job**: This function must contain the logic about how a job should be create. Is not neccesary a return.
- **read_job**: This function must return a Job Object accord to Job name.
- **read_status**: This function must return a Status Object from Job.
