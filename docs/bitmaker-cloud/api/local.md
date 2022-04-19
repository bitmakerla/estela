---
layout: page
title: Local Setup
nav_order: 1
parent: API
grand_parent: Bitmaker Cloud
---

# Local Setup
The following steps describe how we deploy Bitmaker Cloud locally using Kubernetes
on Minikube. We will show how to deploy it using a local registry.
Feel free to modify any files to fit your needs and propose your
changes to expand the compatibility of Bitmaker Cloud with other platforms.

Currently, project zips uploaded to Bitmaker Cloud for deployment are uploaded
to an AWS S3 bucket, from where they are later fetched to build their docker image.
For this reason, you will need access to an AWS S3 bucket to be able to deploy 
these projects.

If you want to deploy Bitmaker Cloud to a production environment, we recommend
using the provided [helm chart]({% link bitmaker-cloud/api/helm.md %}) for a
more seamless deployment.

To run the Bitmaker Cloud API in a local environment, we use Minikube as a cluster for Kubernetes.
- The database for Django API is configured as a Docker service.
- In local we use a local registry setting as a Docker service. (*in production we use AWS ECR*)

If this is the first time you build the app, take the following steps:

- Create a `Makefile` using the `Makefile.example` file in `bitmaker-api/`.

- Start the Minikube cluster and the database container.
  ```bash
  $ make start
  ```

- Edit `config/kubernetes/bitmaker-api-services.yaml` and set the IP address of the database endpoint to the IP address you get after running the following command:
  ```bash
  $ minikube ssh 'grep host.minikube.internal /etc/hosts | cut -f1'
  # 192.168.49.1 -> This IP could change
  ```
  Make sure that the **REGISTRY_HOST** IP in your `Makefile` is the same as this value, keeping the port `5000`
  as it is specified for the local registry service (e.g., `192.168.49.1:5000`). In case it is different, please use
  `make down` and then use `make start` again with the updated IP. This is needed in order to avoid conflicts in the
  local registry.

  Then, apply the `bitmaker-api-services.yaml` file:
  ```bash
  $ kubectl apply -f config/kubernetes/bitmaker-api-services.yaml
  ```

- In order to give an external IP to the API, open a new terminal an create a tunnel:
  ```bash
  $ minikube tunnel
  ```

- In `config/kubernetes/`, create a new file `bitmaker-api-configmaps.yaml` based on `bitmaker-api-configmaps.yaml.example`.
  Then, modify both files with the appropriate values:
  - **\<DB_HOST\>** and **\<DB_PORT\>**: _Note_ Write the port number between quotation marks.
  - **\<DB_NAME\>**: The database name for the API, use the database `bitmaker` created during the Terraform deployment.
  - **\<DJANGO_API_HOST\>**: The EXTERNAL-IP value of the LoadBalancer `bitmaker-django-api-service` formatted as URL., e.g., `http://<EXTERNAL_IP>`. You can get this value with:
	```bash
	$ kubectl get svc bitmaker-django-api-service # Copy the EXTERNAL-IP
	```
  - **\<DJANGO_ALLOWED_HOSTS\>**: Allowed hosts where API could be deployed. In local, this is the same as the EXTERNAL-IP value.
  - **\<CORS_ORIGIN_WHITELIST\>**: URLs from which API could be consumed.
  - **\<ENGINE\>**: The engine used to deploy the API. Currently, only `kubernetes` is supported, but you can [implement your engine]({% link bitmaker-cloud/api/engines.md %}).
  - **\<CREDENTIALS\>**: The type of credentials you'll use for the registry. It is `local` by default, but `aws` is also supported
            in case you use AWS ECR as your registry host. If you wish use another container registry service, you can add a new
            [credentials configuration](https://github.com/bitmakerla/bitmaker-cloud/tree/main/bitmaker-api/credentials).
  - **\<ELASTICSEARCH_HOST\>** and **\<ELASTICSEARCH_PORT\>**: The host and port of the Elasticsearch service. These values are not needed
            for Bitmaker Cloud to work, but the spider logs will not be stored in case they are not present.
  - **\<AWS_DEFAULT_REGION\>**: The AWS default region of the container registry, e.g., `us-east-2`. This value will not be relevant if you do not use AWS ECR.
  - **\<AWS_STORAGE_BUCKET_NAME\>** : The name of AWS S3 Storage where the static django files will be stored (the bucket must already exist), e.g., `bitmaker-django-api`.
  - **\<REGISTRY_ID\>** and **\<REGISTRY_HOST\>**: ID and host of the registry service, check these values in the
            Amazon ECR panel. The `<REGISTRY_ID>` is the first segment of the repository URI. I.e,
            `<REGISTRY_ID>.dkr.ecr.<REGION>.amazonaws.com`. If you have already configured your aws client, you can use the
            following command to get information about your repositories. _Note_: Write the ID number between quotation marks.
            The `<REGISTRY_ID>` will not be relevant if you do not use AWS ECR.
  - **\<REPOSITORY_NAME\>**: The name of the repository destined to store the Scrapy projects uploaded to the API, e.g., `bitmaker-api-projects`.
  - **\<BUCKET_NAME_PROJECTS\>**: The name of the S3 bucket where the uploaded project zips will be stored before being used
            to build their Docker image and deploy them.

- In `config/kubernetes`, create a new file `bitmaker-api-secrets.yaml` based on
  `bitmaker-api-secrets.yaml.example`. Then, modify the file with the appropriate
  values. Do not forget to encode all the values in _base64_,
  use an [online tool](https://www.base64encode.org/) or the terminal
  `printf "<TEXT>" | base64`.
  - **\<DB_USER_BASE_64\>**: The DB user of the API.
  - **\<DB_PASSWORD_BASE_64\>**: The DB password for the selected DB user.
  - **\<AWS_ACCESS_KEY_ID_BASE_64\>** and **\<AWS_SECRET_ACCESS_KEY_BASE_64\>**: Enter your AWS credentials. Needed to upload the project zips to the AWS S3 bucket.
  - **\<MONGO_CONNECTION_BASE_64\>**: The connection to MongoDB where all the data collected from the spiders is stored.
  - **\<DJANGO_SECRET_KEY_BASE_64\>**: Your Django app secret key.
  - **\<ELASTICSEARCH_USERNAME_BASE_64\>** and **<ELASTICSEARCH_PASSWORD_BASE_64\>**: Enter your Elasticsearch credentials. These values are not needed
            for Bitmaker Cloud to work, but the spider logs will not be stored in case they are not present.

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
