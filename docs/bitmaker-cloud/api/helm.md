---
layout: page
title: Helm Chart
nav_order: 3
parent: API
grand_parent: Bitmaker Cloud
---

# Deploying with Helm Chart

Helm is useful to manage Kubernetes applications and Helm Charts allow us to define
install, and upgrade complex Kubernetes applications. You can learn more about Helm
in its [official webpage](https://helm.sh/).

Bitmaker Cloud provides a Helm Chart to allow an easy deployment. In order to deploy
using Helm Chart, you need to configure some variables. In the [`bitmaker-api-helm/`](https://github.com/bitmakerla/bitmaker-cloud/tree/main/bitmaker-api-helm) directory,
you will find the `values.yaml.example` file, which you should copy into a file named
`values.yaml` and set the required values.

## Understand the values

First, it is necesary to set the values in `values.yaml`:
- **Local**: If deploying locally, set to true.

- **Endpoint_ip**: In case we set Local to true, this is the endpoint to connect with the database for django-api.

- **config** and **secrets**: The name of configmap and secrets files for the API.

- **registryHost**: The registry host of Bitmaker API images.

- **\<DB_HOST\>**: Host of the Bitmaker Django API database.

- **\<DB_PORT\>**: Port of the Bitmaker Django API database.

- **\<DB_NAME\>**: Database name for Bitmaker Django API.

- **\<AWS_DEFAULT_REGION\>**: Region of AWS that you use.

- **\<REGISTRY_ID\>**: Just if you registry has an ID.

- **\<REGISTRY_HOST\>**: URL of you registry.

- **\<RESPOSITORY_NAME\>**: Name of image repository for project images.

- **\<CORS_ORIGIN_WHITELIST\>**: List of authorized origins to make requests.

- **\<KAFKA_HOSTS\>**: Host of Kafka service.

- **\<KAFKA_PORT\>**: Port of Kafka service.

- **\<STAGE\>**: Could be DEVELOPMENT or PRODUCTION.

- **\<DJANGO_SETTING_MODULE\>**: Settings to use (local, production, or test). You
  can find the settings files in the `bitmaker-api/config/settings/` directory.

- **\<CELERY_BROKER_URL\>**: URL of the celery broker.

- **\<CELERY_RESULT_BACKEND\>**: Where to store the results from tasks.

The next values need to be encoded in base64 because they are inside secrets files.
You can use an [online tool](https://www.base64encode.org/) or in a terminal with `printf "<TEXT>" | base64`.

- **\<DB_USER\>**: Username for the Bitmaker Django API database.

- **\<DB_PASSWORD\>**: Password of the database user.

- **\<MONGO_CONNECTION\>**: The connection to MongoDB formatted in base64, where all
  the data collected from the spiders is stored.

- **\<AWS_ACCESS_KEY_ID\>** and **\<AWS_SECRET_ACCESS_KEY\>**: Enter your AWS credentials.

## Install the API

Once the `values.yaml` file is filled in, we proceed to execute the first install:
```bash
$ helm install <RELEASE_NAME> --create-namespace --debug --namespace=<NAMESPACE> .
```

Make sure to be located in the `bitmaker-api-helm/` directory before running this command.

## In Minikube

If you use minikube, you need run:
```bash
$ minikube tunnel
```

Next, get the IP of the loadbalancer:
```bash
$ kubectl get services -n <NAMESPACE> bitmaker-django-api-service --output jsonpath='{.status.loadBalancer.ingress[0].ip}'
```

And now, upgrade the API with this value. Remember that the API only allows this IP:
```bash
$ helm upgrade --install <RELEASE_NAME> . --set django_api_host=<IP_LOADBALANCER> -n <NAMESPACE>
```

To apply the changes in `bitmaker-django-api` deployment, restart the deployment:
```bash
$ kubectl rollout restart deploy bitmaker-django-api -n <NAMESPACE>
```

To create your superuser for Django admin:
```bash
$ kubectl exec --stdin --tty $(APIPOD) -- python manage.py createsuperuser
```

## Uninstall API
To uninstall the API run the following command:

```bash
$ helm uninstall <RELEASE_NAME> -n <NAMESPACE>
```
