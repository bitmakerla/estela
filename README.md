# Bitmaker Scraping Product

[![Code style: black](https://img.shields.io/badge/code%20style-black-000000.svg)](https://github.com/psf/black)

## Set-up

You need to add an environment file `.env` in the root directory.

If it is the first time you build the project, run:
```sh
$ make setup
```
It will create the containers, apply the initial migrations and ask you to create an superuser for the web application.

After the set-up, you can:

```sh
$ make stop     # Stop the containers
$ make start    # Start the containers
$ make restart  # Restart the containers
```

## Requirements

```sh
$ pip install -r requirements/dev.txt
```

## Update Migrations

```sh
$ make makemigrations
```

## Django Admin

Go to [Django Admin](http://localhost:8000/admin) and login with your user (superuser) credentials.

## Set-up AWS EKS Cluster

To create a simple cluster you can use `config/cluster.yaml` configuration. You need the
[eksctl](https://docs.aws.amazon.com/emr/latest/EMR-on-EKS-DevelopmentGuide/setting-up-eksctl.html) client installed
to run the following commands.

```sh
$ eksctl create cluster -f config/cluster.yaml          # Create cluster
$ eksctl delete cluster test --wait --region us-east-2  # Delete cluster
```

After that, you need to put your AWS credentials and Cluster API server endpoint in the environment file `.env`.

## Set-up AWS ECR Container Registry

Registry and Repository can be manually created in [AWS ECR](https://aws.amazon.com/ecr/)

After that, you need to put your AWS credentials, Registry API server endpoint and Repository name in the environment file `.env`.

Once the `.env` file is completely filled, you need to rebuild the app with:

```sh
$ make rebuild
```

## Testing

```sh
$ make test
```

## Formatting

```sh
$ black .
```
