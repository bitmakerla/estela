---
layout: page
title: Local Setup
permalink: /cloud/api/local
nav_order: 1
parent: API
grand_parent: Bitmaker Cloud
---

# Local Setup
The following steps describe the way we deploy Bitmaker Cloud locally using Kubernetes
on Minikube and AWS ECR as our registry host. Feel free to modify any files
to fit your needs and propose your changes to expand the compatibility of Bitmaker Cloud
with other platforms.

To run the Bitmaker Cloud API in a local environment, we use Minikube as a cluster for Kubernetes. 
- The database for Django API is configured as a Docker service.
- In local we use a local registry setting as a Docker service. (*in production we use AWS ECR*)

If this is the first time you build the app, take the following steps:

- Create a `Makefile` using the `Makefile.example` file in `bitmaker-api/`. Set the value of
  the `REPOSITORY` variable to your AWS registry host.

- Configure the AWS CLI with your credentials. Check [the official guide](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html) for more information.

- Start the Minikube cluster and the database container.
  ```bash
  $ make start
  ```

- Edit _config/kubernetes-local/bitmaker-api-services.yaml_ and set the IP address of the database endpoint to the IP address you get after running the following command:
  ```bash
  $ minikube ssh 'grep host.minikube.internal /etc/hosts | cut -f1'
  # 192.168.64.1 -> This IP could change
  ```
  Then, apply the _bitmaker-api-services.yaml_ file:
  ```bash
  $ kubectl apply -f config/kubernetes-local/bitmaker-api-services.yaml
  ```
  
- In order to give an external IP to the API, open a new terminal an create a tunnel:
  ```bash
  $ minikube tunnel
  ```

- In `config/kubernetes-local/`, create a new file `bitmaker-api-configmaps.yaml` based on `bitmaker-api-configmaps.yaml.example`,
  and a `bitmaker-api-secrets.yaml` file based on `bitmaker-api-secrets.yaml.example`.
  Then, modify both files with the appropriate values:
  - `<DJANGO_API_HOST>`: The EXTERNAL-IP value of the LoadBalancer _bitmaker-django-api-service_ formatted as URL., e.g., `http://<EXTERNAL_IP>`. You can get this value with:
	```bash
	$ kubectl get svc bitmaker-django-api-service # Copy the EXTERNAL-IP
	```
  - `<DJANGO_ALLOWED_HOSTS>`: Allowed hosts where API could be deployed. This is the same as the EXTERNAL-IP value.
  - `<MONGO_CONNECTION>`: The connection to Mongo DB encoded in base64 where all the data collected from the spiders is stored.
  - `<ELASTICSEARCH_HOST>` and `<ELASTICSEARCH_PORT>`: The host and port of the Elasticsearch service.
  - `<AWS_ACCESS_KEY_ID_BASE_64>` and `<AWS_SECRET_ACCESS_KEY_BASE_64>`: Enter your AWS credentials encoded in base64.
            You can use an [online tool](https://www.base64encode.org/) or in a terminal with `printf "<TEXT>" | base64`.
  - `<ELASTICSEARCH_USERNAME_BASE_64>` and `<ELASTICSEARCH_PASSWORD_BASE_64>`: Enter your Elasticsearch credentials encoded in base64.

- Apply the setup command, which build and upload the images, and apply all the Kubernetes `yaml` files:
  ```bash
  $ make setup
  ```

- Once all the services and deployments are running, apply the migrations and create a superuser for Django Admin:
  ```bash
  $ make migrate
  $ make createsuperuser
  ```
  If you get `error: unable to upgrade connection: container not found ("bitmaker-django-api")`, please allow a few minutes
  for the service to be up and running.

<h3> Commands </h3>

After the first setup, you can:
```bash
$ make start    # Start the application
$ make stop     # Stop the application
$ make rebuild-api  # Rebuild only the API after some changes in the API
$ make rebuild-all  # Rebuild the whole application including API, celery beat & worker, and redis
$ make down     # Delete the application
```

## Cluster metrics

When running locally, enable the metrics add-on.
```bash
minikube addons enable metrics-server
```

Then, you can use the tool `kubectl top` to watch the resource consumption for nodes or pods.
