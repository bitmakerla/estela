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

## Local Setup

If it is the first time you build the app, do the following steps:

- Configure the aws client with your credentials. Check [the official guide](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html) for more information.

- Start the minikube cluster and the database container.
  ```bash
  $ make start
  ```

- Check that the IP address of the database endpoint in _config/kubernetes-local/bitmaker-api-services.yaml_ is the same as:
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

- Create a new file _bitmaker-api-configmaps.yaml_ based on _bitmaker-api-configmaps.yaml.example_,
  and a _bitmaker-api-secrets.yaml_ file based on _bitmaker-api-secrets.yaml.example_.
  Then, modify both files with the appropriate values:
  - _<DJANGO\_API\_HOST>_: The EXTERNAL-IP value of the LoadBalancer _bitmaker-django-api-service_ formatted as URL. e.g. _http://<EXTERNAL\_IP>:8000_. You can get this value with:
	```bash
	$ kubectl get svc bitmaker-django-api-service # Copy the EXTERNAL-IP
	```
  - _<DJANGO\_ALLOWED\_HOSTS>_: Allowed hosts where API could be deployed.
  - _<AWS\_ACCES\_KEY\_ID\_BASE\_64>_ and _<AWS\_SECRET\_ACCESS\_KEY\_BASE\_64>_: Enter your credentials in base64.

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

## Deployment

If it is the first time you deploy the app, do the following steps:

- Install [`doctl`](https://github.com/digitalocean/doctl), the command line interface for the DigitalOcean API. 
  Then, authenticate yourself by providing an access token.
  
- Deploy the infrastructure using the Terraform files available in [this repository](https://gitlab.com/bitmakerla/dev/terraform-deployment).

- Configure `kubectl` to use the cluster context.
  ```bash
  $ doctl kubernetes cluster kubeconfig save scraping-product-cluster
  ```
  
- Apply the _config/kubernetes-prod/bitmaker-api-services.yaml_ file:
  ```bash
  $ kubectl apply -f config/kubernetes-prod/bitmaker-api-services.yaml
  ```

- Create a new file _bitmaker-api-configmaps.yaml_ based on _bitmaker-api-configmaps.yaml.example_. Then, modify the file with the appropriate values:
  - _<DB\_HOST>_ and _<DB\_PORT>_: Go to  _DigitalOcean panel/databases/scraping-product-mysql_. Then copy the host and the port available in the connection details section.
	You can also get this information with:
	```bash
	$ doctl databases list # get the ID of the scraping-product-mysql database
	$ doctl databases connection <SCRAPING-PRODUCT-MYSQL-ID>
	```
	_Note_: Write the port between quotation marks.
  - _<DB\_NAME>_: The database name for the API, use the database `bitmaker` created during the Terraform deployment.
  - _<DJANGO\_API\_HOST>_: The EXTERNAL-IP value of the LoadBalancer _bitmaker-django-api-service_ formatted as URL. e.g. _http://<EXTERNAL\_IP>:8000_. You can get this value with:
	```bash
	$ kubectl get svc bitmaker-django-api-service # Copy the EXTERNAL-IP
	```
  - _<DJANGO\_ALLOWED\_HOSTS>_: Allowed hosts where API could be deployed.
  - _<AWS\_DEFAULT\_REGION>_: The AWS default region of the container registry, e.g. `us-east-2`.
  - _<REGISTRY\_ID>_ and _<REGISTRY\_HOST>_: ID and host of the registry service, check these values in the Amazon ECR panel. _Note_: Write the ID number between quotation marks.
  - _<REPOSITORY\_NAME>_: The name of the repository destined to store the API projects, e.g. `bitmaker-projects`.


- Create a new file _bitmaker-api-secrets.yaml_ based on _bitmaker-api-secrets.yaml.example_. Then, modify the file with the appropriate values. Do not forget to encode all the values in _base64_,
  use an [online tool](https://www.base64encode.org/) or the terminal `printf "<TEXT>" | base64`.
  - _<DB\_USER\_BASE\_64>_: The DB user of the API formatted in base64, use the user `bitmaker-api` created during the Terraform deployment.
  - _<DB\_PASSWORD\_BASE\_64>_: The DB password for the selected DB user formatted in base64. This value can be found in the _Users & Databases_ tab of the database panel.
  - _<AWS\_ACCES\_KEY\_ID\_BASE\_64>_ and _<AWS\_SECRET\_ACCESS\_KEY\_BASE\_64>_: Enter your AWS credentials formatted in base64.


- Apply the Secrets, ConfigMaps and deploy the registry cron job helper:
  ```bash
  $ kubectl apply -f config/kubernetes-prod/bitmaker-api-secrets.yaml
  $ kubectl apply -f config/kubernetes-prod/bitmaker-api-configmaps.yaml
  $ kubectl apply -f config/kubernetes-prod/aws-registry-cronjob.yaml
  ```
  
- The building and uploading of the images will be done by the GitLab CI/CD job. As well as the deployment to the kubernetes cluster and the migrations.
  _Note_: The Celery deployment will be in a _CrashLoopBackOff_ state until the migrations are done.

- Finally, create a superuser for Django Admin:
  ```bash
  $ make createsuperuser
  ```

## Update Migrations

```sh
$ make makemigrations
```

## Access Django Admin

Django Admin is running in `<DJANGO_API_HOST>/admin`,
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
