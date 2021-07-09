# Bitmaker Scraping Product

[![Code style: black](https://img.shields.io/badge/code%20style-black-000000.svg)](https://github.com/psf/black)

## Requirements

- Minikube v1.22.0
- Docker v20.10.7
- aws-cli v2.2.18
- Install python dependencies:
  ```bash
  $ pip install -r requirements/dev.txt
  ```

## Set-up

If it is the first time you build the app, do the following steps:

- Configure the aws client with your credentials. Check [the official guide](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html) for more information.

- Start the minikube cluster and the database container.
  ```bash
  $ make start
  ```

- Check that the IP address of the database endpoint in _config/kubernetes-local/bitmaker-api-services.yaml_ is the same as:
  ```bash
  $ minikube ssh 'grep host.minikube.internal /etc/hosts | cut -f1'
  $ # 192.168.64.1 -> This IP could change
  ```
  Then, apply the _bitmaker-api-services.yaml_ file:
  ```bash
  $ kubectl apply -f config/kubernetes-local/bitmaker-api-services.yaml
  ```
  
- In order to give an external IP to the API, open a new terminal an create a tunnel:
  ```bash
  $ minikube tunnel
  ```

- Create a new file _bitmaker-configmaps.yaml_ based on _bitmaker-configmaps.yaml.example_,
  and a _bitmaker-secrets.yaml_ file based on _bitmaker-secrets.yaml.example_.
  Then, modify both files with the appropriate values:

  - _<DJANGO\_HOST>_: The EXTERNAL-IP value of `bitmaker-django-api-service`.
  - _<AWS\_ACCES\_KEY\_ID>_ and _<AWS\_SECRET\_ACCESS\_KEY>_: Enter your credentials.
  - _<REGISTRY\_HOST>_ and _<REGISTRY\_NAME>_: Host and Name of the remote Registry service.
  - _<MONGO\_DB\_CONNECTION>_: An active connection to a mongodb cluster.

- Apply the setup command, which build and upload the images, and apply all the kubernetes _yaml_ files:
  ```bash
  $ make setup
  ```

- Once all the services and deployments are running, apply the migrations and create a superuser for Django Admin:
  ```bash
  $ make migrate
  $ make createsuperuser
  ```

After the first setup, you can:
```bash
$ make start    # Start the application
$ make stop     # Stop the application
$ make rebuild  # Rebuild the application after some changes in the API
$ make down     # Delete the application
```

## Update Migrations

```sh
$ make makemigrations
```

## Access Django Admin

Django Admin is running in `http://<DJANGO_HOST>:8000/admin`,
login with your user (superuser) credentials.


## Set-up AWS ECR Container Registry

Registry and Repository can be manually created in [AWS ECR](https://aws.amazon.com/ecr/)

## Upload Images to the Registry

You need to configure the aws client. Check [the official guide](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html) for more information.

```bash
$ make build-all-images
$ make upload-all-images
```

## Testing

```sh
$ make test
```

## Formatting

```sh
$ make lint
```
