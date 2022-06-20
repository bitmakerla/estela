<h1 align="center">Estela API</h1>

[![Code style: black](https://img.shields.io/badge/code%20style-black-000000.svg)](https://github.com/psf/black)

The API consists of three main components:
- Django API: Implements a REST API built with the Django REST framework toolkit, exposing several endpoints to manage
    projects, spiders, and jobs.
- Celery worker and beat: Responsible for executing the tasks and periodic tasks ordered by the API.
- Redis: Keeps a record of the tasks and periodic tasks to be executed.  It is needed by Celery.

These components have a corresponding docker configuration file to build their images and run in Docker containers.

<h2>Requirements</h2>

- Minikube v1.22.0
- Docker v20.10.7 *include docker-compose*
- aws-cli v2.2.18
- Python v3.6.x
- Install the Python dependencies:
  ```bash
  $ pip install -r requirements/dev.txt
  ```

<h2>Setup</h2>

For a detailed description of how to set up your Kafka cluster, please check out our
[official documentation](https://github.com/bitmakerla/bitmaker-cloud/tree/main/bitmaker-api).

<h2>Testing</h2>

```sh
$ pytest -svx
```

<h2>Docs</h2>

It is important to run the `docs` command every time views, serializers and/or models are modified to obtain the
`api.yaml` that will be used in Estela Web module.

```sh
$ python manage.py generate_swagger -f yaml docs/api.yaml
```

<h1>Engines</h1>

The project was thought to work in Kubernetes but can run in any other orchestrator (e.g., Docker). The API handles
everything with Celery and models. Suppose you want to run jobs in another orchestrator. In that case, you need to
define a new engine as a class following a specific structure, such as containing Job and Status inner classes
according to your needs but respecting base methods. For more details on implementing your Engine, refer to the
(Engines)[https://bitmaker.la/docs/bitmaker-cloud/api/engines.html] section in our official documentation.

<h1>Credentials</h1>

The project needs a Docker image registry and a place to save uploaded projects in order to work. The credentials
module will take care of calling the appropriate methods to access both the registry and the place where the projects
are saved, fetching any required credentials (such as your `AWS_ACCESS_KEY_ID` for AWS). For more information on the
currently supported credentials, refer to the (Credentials)[https://bitmaker.la/docs/bitmaker-cloud/api/credentials.html]
section in our official documentation.
