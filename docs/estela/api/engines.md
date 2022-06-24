---
layout: page
title: Engines
parent: API
grand_parent: estela
---

# Engines
The project was thought to work in Kubernetes but can run in any other orchestrator (e.g., Docker). The API handles
everything with Celery and models. Suppose you want to run jobs in another orchestrator. In that case, you need to
define a new engine as a class following a specific structure, such as containing Job and Status inner classes
according to your needs but respecting base methods. Add your engine in `engines/config.py` with a name:

```py
def JobManager(engine):
    engines = {
        "kubernetes": KubernetesEngine,
        "your_engine": YourEngine,
    }

    return engines[engine]()
```

The use of specific credentials is defined in the project settings as an environment variable at
`config/settings/base.py`:
```py
ENGINE = env("ENGINE")
```
Set this value according to your needs.

## Status

This class represents the status of the job, initially it must contain three attributes:

- **active**: A positive number if the job is active and `None` otherwise. E.g., in Kubernetes, the number of active pods.
- **succeed**: A positive number if the job succeeded and `None` otherwise. E.g., in Kubernetes, the number of pods that succeeded.
- **failed**: A positive number if the job failed and `None` otherwise. E.g., in Kubernetes, the number of pods that failed.

## Job

This class represents a job, initially it must contain two attributes:

- **name**: This could be a job name or job ID, but it must be a way to identify a job. E.g., the job name in kubernetes
  or the container name in Docker.
- **status**: A status object that represents the job status.

## Create your Engine

The `Engine` class controls the creation, deletion, and reading of jobs. Initially, it must have four methods:
- **create_job**: This function must contain the logic to create a job. E.g., a Kubernetes Job or a Docker Container. It must return a Job Object.
- **delete_job**: This function must contain the logic to delete a job. It is not required to return a value.
- **read_job**: This function must return a Job Object according to the Job name.
- **read_status**: This function must return a Status Object from a specified Job.
