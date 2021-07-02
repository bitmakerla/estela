# Bitmaker Scraping Product

[![Code style: black](https://img.shields.io/badge/code%20style-black-000000.svg)](https://github.com/psf/black)

## Requirements

- Minikube v1.21.0
- aws-cli v2.2.13
- MySQL 8.0.25 (stable)
- Install python dependencies:
  ```bash
  $ pip install -r requirements/dev.txt
  ```

## Set-up

If it is the first time you build the app, do the following steps:

- Configure the aws client with your credentials. Check [the official guide](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html) for more information.

- Set the local MySQL server

  - The MySQL server must allow remote connections, 
    you might need to modify the _bind-address_ parameter to "0.0.0.0"
	in your configuration file.
	
  - Create a new database:
	```sql
	$ CREATE DATABASE bitmaker;
	```
	
  - Create a new user with all the privileges:
	```sql
	$ CREATE USER 'django-api'@'localhost' IDENTIFIED BY 'bitmaker12345';
	$ GRANT ALL PRIVILEGES ON *.* TO 'django-api'@'localhost' WITH GRANT OPTION;
	$ CREATE USER 'django-api'@'%' IDENTIFIED BY 'bitmaker12345';
	$ GRANT ALL PRIVILEGES ON *.* TO 'django-api'@'%' WITH GRANT OPTION;
	```

- Check that the IP address of the database endpoint in 
  _config/kubernetes-local/services.yaml_ is the same as:
  ```bash
  $ minikube ssh 'grep host.minikube.internal /etc/hosts | cut -f1'
  $ # 192.168.64.1 -> This IP could change
  ```

- Modify the _api.yaml_ file in _config/kubernetes-local_ with the appropriate values:

  - <AWS\_ACCES\_KEY\_ID> and <AWS\_SECRET\_ACCESS\_KEY>: Enter your credentials.
  - <REGISTRY\_HOST> and <REGISTRY\_NAME>: Host and Name of the remote Registry service.

- Modify the _kafka.yaml_ file in _config/kubernetes-local_ with the appropriate mongo connection in the MONGO\_DB\_CONNECTION fields.

- Apply the setup command, which starts minikube and apply the kubernetes _yaml_ files:
  ```bash
  $ make setup
  ```

- In order to give an external IP to the API, open a new terminal an create a tunnel:
  ```bash
  $ minikube tunnel
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

## Upload Images to the Repository

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
