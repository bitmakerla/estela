---
layout: page
title: Deployment
permalink: /cloud/api/deployment
nav_order: 2
parent: API
grand_parent: Bitmaker Cloud
---

# Deployment

If it is the first time you deploy the app, do the following steps:

- Install [`doctl`](https://github.com/digitalocean/doctl), the command-line interface for the DigitalOcean API. 
  Then, authenticate yourself by providing an access token. You can find the instructions for authenticating [here](https://github.com/digitalocean/doctl#authenticating-with-digitalocean).
  
- Deploy the infrastructure using the Terraform files available in [this repository](https://gitlab.com/bitmakerla/dev/terraform-deployment).

- Configure `kubectl` to use the cluster context.
  ```bash
  $ doctl kubernetes cluster kubeconfig save scraping-product-cluster
  ```
  
- Apply the _config/kubernetes-prod/bitmaker-api-services.yaml_ file:
  ```bash
  $ kubectl apply -f config/kubernetes-prod/bitmaker-api-services.yaml
  ```

- In `config/kubernetes-prod/`, create a new file `bitmaker-api-configmaps.yaml` based on `bitmaker-api-configmaps.yaml.example`. Then, modify the file with the appropriate values:
  - `<DB_HOST>` and `<DB_PORT>`: Go to  _DigitalOcean panel/databases/scraping-product-mysql_. Then copy the host and the port available in the connection details section. _Note_ Write the PORT number between quotation marks.
	You can also get this information with:
	```bash
	$ doctl databases list # get the ID of the scraping-product-mysql database
	$ doctl databases connection <SCRAPING-PRODUCT-MYSQL-ID>
	```
	_Note_: Write the port between quotation marks.
  - `<DB_NAME>`: The database name for the API, use the database `bitmaker` created during the Terraform deployment.
  - `<DJANGO_API_HOST>`: The EXTERNAL-IP value of the LoadBalancer `bitmaker-django-api-service` formatted as URL., e.g., `http://<EXTERNAL_IP>:8000`. You can get this value with:
	```bash
	$ kubectl get svc bitmaker-django-api-service # Copy the EXTERNAL-IP
	```
  - `<DJANGO_ALLOWED_HOSTS>`: Allowed hosts where API could be deployed.
  - `<CORS_ORIGIN_WHITELIST>`: URLs from which API could be consumed.
  - `<AWS_DEFAULT_REGION>`: The AWS default region of the container registry, e.g., `us-east-2`.
  - `<AWS_STORAGE_BUCKET_NAME>` : The name of AWS S3 Storage where the static django files will be stored (the bucket must already exist), e.g., `bitmaker-django-api`.
  - `<REGISTRY_ID>` and `<REGISTRY_HOST>`: ID and host of the registry service, check these values in the Amazon ECR panel. The `<REGISTRY_ID>` is the first segment of the repository URI. I.e, `<REGISTRY_ID>.dkr.ecr.<REGION>.amazonaws.com`. If you have already configured your aws client, you can use the following command to get information about your repositories. _Note_: Write the ID number between quotation marks.
    ```bash
    $ aws ecr describe-repositories
    {
      "repositories": [
          {
              "repositoryArn": "...",
              "registryId": "012345678901", <-- This is the <REGISTRY_ID>
              "repositoryName": "repository_name", <-- This is the <REPOSITORY_NAME>
              "repositoryUri":
                  "012345678901.dkr.ecr.us-east-2.amazonaws.com/repository_name",
                   ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
                   ^
                   This is the <REGISTRY_HOST>
              ...
          }
      ]
    }
    ```

  - `<REPOSITORY_NAME>`: The name of the repository destined to store the API projects, e.g., `bitmaker-projects`.
  - `<ELASTICSEARCH_HOST>`: The endpoint of the Elasticsearch service running in AWS.

- Create a new file _bitmaker-api-secrets.yaml_ based on _bitmaker-api-secrets.yaml.example_. Then, modify the file with the appropriate values. Do not forget to encode all the values in _base64_,
  use an [online tool](https://www.base64encode.org/) or the terminal `printf "<TEXT>" | base64`.
  - _<DB\_USER\_BASE\_64>_: The DB user of the API encoded in base64, use the user `bitmaker-api` created during the Terraform deployment.
  - _<DB\_PASSWORD\_BASE\_64>_: The DB password for the selected DB user encoded in base64. This value can be found in the _Users & Databases_ tab of the database panel in Digital Ocean.
  - _<AWS\_ACCES\_KEY\_ID\_BASE\_64>_ and _<AWS\_SECRET\_ACCESS\_KEY\_BASE\_64>_: Enter your AWS credentials encoded in base64.
  - _<ELASTICSEARCH\_USERNAME\_BASE\_64>_ and _<ELASTICSEARCH\_PASSWORD\_BASE\_64>_: Enter your Elasticsearch credentials encoded in base64.


- Apply the Secrets, the ConfigMaps, the Filebeat DaemonSet and the registry cron job helper:
  ```bash
  $ kubectl apply -f config/kubernetes-prod/bitmaker-api-secrets.yaml
  $ kubectl apply -f config/kubernetes-prod/bitmaker-api-configmaps.yaml
  $ kubectl apply -f config/kubernetes-prod/bitmaker-filebeat.yaml
  $ kubectl apply -f config/kubernetes-prod/aws-registry-cronjob.yaml
  ```
  
- The building and uploading of the images will be done by the GitLab CI/CD job. As well as the deployment to the kubernetes cluster and the migrations.
  _Note_: The Celery deployment will be in a _CrashLoopBackOff_ state until the migrations are done.

- Finally, create a superuser for Django Admin:
  ```bash
  $ make createsuperuser
  ```
  
<h2> Cluster metrics </h2>

In production, install the [kubernetes metrics-server](https://github.com/kubernetes-sigs/metrics-server)
in the cluster.

Then, you can use the tool `kubectl top` to watch the resource consumption for nodes or pods.
