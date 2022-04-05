---
layout: page
title: Local Setup
permalink: /cloud/api/local-setup
nav_order: 1
parent: API
grand_parent: Bitmaker Cloud
---

# Local Setup
The following steps describe how we deploy Bitmaker Cloud locally using Kubernetes
on Minikube. We use an AWS container registry, but it can also be deployed using
a local registry. Feel free to modify any files to fit your needs and propose your
changes to expand the compatibility of Bitmaker Cloud with other platforms.

To run the Bitmaker Cloud API in a local environment, we use Minikube as a cluster for Kubernetes. 
- The database for Django API is configured as a Docker service.
- In local we use a local registry setting as a Docker service. (*in production we use AWS ECR*)

If this is the first time you build the app, take the following steps:

- Create a `Makefile` using the `Makefile.example` file in `bitmaker-api/`. Set the value of
  the `REPOSITORY` variable to your registry host. In case you want to use a local registry,
  use a placeholder for this value (e.g., `192.168.49.1`), continue with the other steps and
  later check that the registry host is correct.

- Start the Minikube cluster and the database container.
  ```bash
  $ make start
  ```

- Edit _config/kubernetes/bitmaker-api-services.yaml_ and set the IP address of the database endpoint to the IP address you get after running the following command:
  ```bash
  $ minikube ssh 'grep host.minikube.internal /etc/hosts | cut -f1'
  # 192.168.49.1 -> This IP could change
  ```
  If you use a local registry host, you should verify that the registry host IP
  and the IP you got in this step are the same.
  Then, apply the _bitmaker-api-services.yaml_ file:
  ```bash
  $ kubectl apply -f config/kubernetes/bitmaker-api-services.yaml
  ```
  
- In order to give an external IP to the API, open a new terminal an create a tunnel:
  ```bash
  $ minikube tunnel
  ```

- In `config/kubernetes/`, create a new file `bitmaker-api-configmaps.yaml` based on `bitmaker-api-configmaps.yaml.example`,
  and a `bitmaker-api-secrets.yaml` file based on `bitmaker-api-secrets.yaml.example`.
  Then, modify both files with the appropriate values:
  - **\<DB_HOST\>** and **\<DB_PORT\>**: _Note_ Write the port number between quotation marks.
  - **\<DB_NAME\>**: The database name for the API, use the database `bitmaker` created during the Terraform deployment.
  - **\<DJANGO_API_HOST\>**: The EXTERNAL-IP value of the LoadBalancer _bitmaker-django-api-service_ formatted as URL., e.g., `http://<EXTERNAL_IP>`. You can get this value with:
	```bash
	$ kubectl get svc bitmaker-django-api-service # Copy the EXTERNAL-IP
	```
  - **\<DJANGO_ALLOWED_HOSTS\>**: Allowed hosts where API could be deployed. In local, this is the same as the EXTERNAL-IP value.
  - **\<CORS_ORIGIN_WHITELIST\>**: URLs from which API could be consumed.
  - **\<MONGO_CONNECTION\>**: The connection to Mongo DB encoded in base64 where all the data collected from the spiders is stored.
  - **\<ELASTICSEARCH_HOST\>** and <ELASTICSEARCH_PORT\>: The host and port of the Elasticsearch service.
  - **\<AWS_ACCESS_KEY_ID_BASE_64\>** and **<AWS_SECRET_ACCESS_KEY_BASE_64\>**: Enter your AWS credentials encoded in base64.
            You can use an [online tool](https://www.base64encode.org/) or in a terminal with `printf "<TEXT>" | base64`.
  - **\<AWS_DEFAULT_REGION\>**: The AWS default region of the container registry, e.g., `us-east-2`.
  - **\<AWS_STORAGE_BUCKET_NAME\>** : The name of AWS S3 Storage where the static django files will be stored (the bucket must already exist), e.g., `bitmaker-django-api`.
  - **\<REGISTRY_ID\>** and **\<REGISTRY_HOST\>**: ID and host of the registry service, check these values in the
            Amazon ECR panel. The `<REGISTRY_ID>` is the first segment of the repository URI. I.e,
            `<REGISTRY_ID>.dkr.ecr.<REGION>.amazonaws.com`. If you have already configured your aws client, you can use the
            following command to get information about your repositories. _Note_: Write the ID number between quotation marks.
  - **\<ELASTICSEARCH_USERNAME_BASE_64\>** and **<ELASTICSEARCH_PASSWORD_BASE_64\>**: Enter your Elasticsearch credentials encoded in base64.
  - **\<REPOSITORY_NAME\>**: The name of the repository destined to store the Scrapy projects uploaded to the API, e.g., `bitmaker-api-projects`.
  - **\<ELASTICSEARCH_HOST\>**: The endpoint of the Elasticsearch service running in AWS.

- Create a new file _bitmaker-api-secrets.yaml_ based on _bitmaker-api-secrets.yaml.example_. Then, modify the file with the appropriate values. Do not forget to encode all the values in _base64_,
  use an [online tool](https://www.base64encode.org/) or the terminal `printf "<TEXT>" | base64`.
  - **\<DB_USER_BASE_64\>**: The DB user of the API.
  - **\<DB_PASSWORD_BASE_64\>**: The DB password for the selected DB user.
  - **\<AWS_ACCES_KEY_ID_BASE_64\>** and **\<AWS_SECRET_ACCESS_KEY_BASE_64\>**: Enter your AWS credentials.
  - **\<ELASTICSEARCH_USERNAME_BASE_64\>** and **\<ELASTICSEARCH_PASSWORD_BASE_64\>**: Enter your Elasticsearch credentials.

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

### Commands

After the first setup, you can:
```bash
$ make start        # Start the application
$ make stop         # Stop the application
$ make rebuild-api  # Rebuild only the API after some changes in the API
$ make rebuild-all  # Rebuild the whole application including API, celery beat & worker, and redis
$ make down         # Delete the application
```

## Cluster metrics

When running locally, enable the metrics add-on.
```bash
$ minikube addons enable metrics-server
```

Then, you can use the tool `kubectl top` to watch the resource consumption for nodes or pods.
