<h1 align="center"> Bitmaker Cloud API </h1>

[![Code style: black](https://img.shields.io/badge/code%20style-black-000000.svg)](https://github.com/psf/black)

Bitmaker API consists of three main components:
- bitmaker ***REMOVED*** api: The ***REMOVED*** app from which requests are handled.
- bitmaker celery worker and beat: Responsible for executing the tasks and periodic tasks ordered by the API.
- bitmaker redis: Keeps a record of the tasks and periodic tasks to be executed.

All these components have a corresponding docker config file to build their images and run in docker containers.

<h2> Requirements </h2>

- Minikube v1.22.0
- Docker v20.10.7 *include docker-compose*
- aws-cli v2.2.18
- Install python dependencies:
  ```bash
  $ pip install -r requirements/dev.txt
  ```

<h2> Local Setup </h2>

To run bitmaker API in a local environment, we use minikube as a cluster for kubernetes. 
- The database for ***REMOVED*** API is configured as a Docker service.
- In local we use a local registry setting as a Docker service. *in deployment we use aws registry*

If it is the first time you build the app, do the following steps:

- Configure the aws client with your credentials. Check [the official guide](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html) for more information.

- Start the minikube cluster and the database container.
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

- In _config/kubernetes-local/_, create a new file _bitmaker-api-configmaps.yaml_ based on _bitmaker-api-configmaps.yaml.example_,
  and a _bitmaker-api-secrets.yaml_ file based on _bitmaker-api-secrets.yaml.example_.
  Then, modify both files with the appropriate values:
  - _<DJANGO\_API\_HOST>_: The EXTERNAL-IP value of the LoadBalancer _bitmaker-***REMOVED***-api-service_ formatted as URL., e.g., `http://<EXTERNAL_IP>`. You can get this value with:
	```bash
	$ kubectl get svc bitmaker-***REMOVED***-api-service # Copy the EXTERNAL-IP
	```
  - _<DJANGO\_ALLOWED\_HOSTS>_: Allowed hosts where API could be deployed. This is the same as the EXTERNAL-IP value.
  - _<MONGO_CONNECTION>_: The connection to Mongo DB formatted in base64 where all the data collected from the spiders is stored.
  - _<ELASTICSEARCH\_HOST>_ and _<ELASTICSEARCH\_PORT>_: The host and port of the Elasticsearch service.
  - _<AWS\_ACCESS\_KEY\_ID\_BASE\_64>_ and _<AWS\_SECRET\_ACCESS\_KEY\_BASE\_64>_: Enter your AWS credentials in base64.
            You can use an [online tool](https://www.base64encode.org/) or in a terminal with `printf "<TEXT>" | base64`.
  - _<ELASTICSEARCH\_USERNAME\_BASE\_64>_ and _<ELASTICSEARCH\_PASSWORD\_BASE\_64>_: Enter your Elasticsearch credentials in base64.

- Apply the setup command, which build and upload the images, and apply all the kubernetes _yaml_ files:
  ```bash
  $ make setup
  ```

- Once all the services and deployments are running, apply the migrations and create a superuser for Django Admin:
  ```bash
  $ make migrate
  $ make createsuperuser
  ```
  If you get `error: unable to upgrade connection: container not found ("bitmaker-***REMOVED***-api")`, please allow a few minutes
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

<h2> Deployment </h2>

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

- In _config/kubernetes-prod/_, create a new file _bitmaker-api-configmaps.yaml_ based on _bitmaker-api-configmaps.yaml.example_. Then, modify the file with the appropriate values:
  - _<DB\_HOST>_ and _<DB\_PORT>_: Go to  _DigitalOcean panel/databases/scraping-product-mysql_. Then copy the host and the port available in the connection details section. _Note_ Write the PORT number between quotation marks.
	You can also get this information with:
	```bash
	$ doctl databases list # get the ID of the scraping-product-mysql database
	$ doctl databases connection <SCRAPING-PRODUCT-MYSQL-ID>
	```
	_Note_: Write the port between quotation marks.
  - _<DB\_NAME>_: The database name for the API, use the database `bitmaker` created during the Terraform deployment.
  - _<DJANGO\_API\_HOST>_: The EXTERNAL-IP value of the LoadBalancer _bitmaker-***REMOVED***-api-service_ formatted as URL., e.g., `http://<EXTERNAL_IP>:8000`. You can get this value with:
	```bash
	$ kubectl get svc bitmaker-***REMOVED***-api-service # Copy the EXTERNAL-IP
	```
  - _<DJANGO\_ALLOWED\_HOSTS>_: Allowed hosts where API could be deployed.
  - _<CORS\_ORIGIN\_WHITELIST>_: URLs from which API could be consumed.
  - _<AWS\_DEFAULT\_REGION>_: The AWS default region of the container registry, e.g., `***REMOVED***`.
  - _<AWS\_STORAGE\_BUCKET\_NAME>_ : The name of AWS S3 Storage where the static ***REMOVED*** files will be stored (the bucket must already exist), e.g., `bitmaker-***REMOVED***-api`.
  - _<REGISTRY\_ID>_ and _<REGISTRY\_HOST>_: ID and host of the registry service, check these values in the Amazon ECR panel. The _<REGISTRY\_ID>_ is the first segment of the repository URI. I.e, `<REGISTRY_ID>.dkr.ecr.<REGION>.amazonaws.com`. If you have already configured your aws client, you can use the following command to get information about your repositories. _Note_: Write the ID number between quotation marks.
    ```bash
    $ aws ecr describe-repositories
    {
      "repositories": [
          {
              "repositoryArn": "...",
              "registryId": "012345678901", <-- This is the <REGISTRY_ID>
              "repositoryName": "repository_name", <-- This is the <REPOSITORY_NAME>
              "repositoryUri":
                  "012345678901.dkr.ecr.***REMOVED***.amazonaws.com/repository_name",
                   ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
                   ^
                   This is the <REGISTRY_HOST>
              ...
          }
      ]
    }
    ```

  - _<REPOSITORY\_NAME>_: The name of the repository destined to store the API projects, e.g., `bitmaker-projects`.
  - _<ELASTICSEARCH\_HOST>_: The endpoint of the Elasticsearch service running in AWS.

- Create a new file _bitmaker-api-secrets.yaml_ based on _bitmaker-api-secrets.yaml.example_. Then, modify the file with the appropriate values. Do not forget to encode all the values in _base64_,
  use an [online tool](https://www.base64encode.org/) or the terminal `printf "<TEXT>" | base64`.
  - _<DB\_USER\_BASE\_64>_: The DB user of the API formatted in base64, use the user `bitmaker-api` created during the Terraform deployment.
  - _<DB\_PASSWORD\_BASE\_64>_: The DB password for the selected DB user formatted in base64. This value can be found in the _Users & Databases_ tab of the database panel in Digital Ocean.
  - _<AWS\_ACCES\_KEY\_ID\_BASE\_64>_ and _<AWS\_SECRET\_ACCESS\_KEY\_BASE\_64>_: Enter your AWS credentials formatted in base64.
  - _<ELASTICSEARCH\_USERNAME\_BASE\_64>_ and _<ELASTICSEARCH\_PASSWORD\_BASE\_64>_: Enter your Elasticsearch credentials formatted in base64.


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

When running locally, enable the metrics add-on.
```bash
minikube addons enable metrics-server
```

In production, install the [kubernetes metrics-server](https://github.com/kubernetes-sigs/metrics-server) in the cluster.

Then, you can use the tool `kubectl top` to watch the resource consumption for nodes or pods.

<h2> Update Migrations </h2>

```sh
$ make makemigrations
```

<h2> Access Django Admin </h2>

Django Admin is running in `<DJANGO_API_HOST>/admin`,
login with your user (superuser) credentials.


<h2> Set-up AWS ECR Container Registry </h2>

Registry and Repository can be manually created in [AWS ECR](https://aws.amazon.com/ecr/).

<h2> Upload Images to the Registry </h2>

You need to configure the aws client. Check [the official guide](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html) for more information.

```bash
$ make build-all-images
$ make upload-all-images
```

<h2> Testing </h2>

```sh
$ make test
```
<h2> Docs </h2>

It is important to run the `docs` command every time views, serializers and/or models are modified to obtain the api.yaml that will be used in bitmaker-web module.

```sh
$ make docs
```

<h2> Formatting </h2>

```sh
$ make lint
```
