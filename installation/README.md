# Estelar Installation Guide

The installation can be divided into three parts:

1. Set the needed resources to run Estelar.
2. Set the environment variables to configure Estelar.
3. Deploy the Estelar modules with Helm.

Estelar is a Kubernetes application, but it can be directly installed in containers (soon).

## Requirements

- Minikube v1.22.0
- Docker v20.10.7 *include docker-compose*
- Python v3.6.x
- Install the Python dependencies:
  ```bash
  $ pip install -r requirements/dev.txt
  ```

## Resources

We must have all the needed resources up and running. Here is the detailed list:

- **Container Orchestrator System**: 

  This system is used to manage the execution of the scrapy jobs, as well as the management
  of the services and deployments of the API module and the Queuing module.
  Estelar was thought to work with Kubernetes, but any other orchestrator can be used (soon).
  The system cab be managed by a cloud provider, e.g. [EKS](https://aws.amazon.com/eks/),
  or by your local computer, e.g.[minikube](https://minikube.sigs.k8s.io/).

- **SQL Relational Database**:

  This database is used to store the metadata of the API module. The default relational 
  database management system is MySQL, but any other manager can be used (soon).
  The database can be managed by a cloud provider, e.g. [RDS](https://aws.amazon.com/rds/),
  or by your local computer.

- **Document Oriented Database**:

  This database is used to store all the data collected from the spiders. The default
  database management system is MongoDB, but any other manager can be used (soon).
  The database can be managed by a cloud provider, 
  e.g. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas),
  or by your local computer.

- **Docker Container Registry**:

  This registry is used to store the Docker images of the API module and the Queuing module.
  The registry can be managed by a cloud provider, e.g. [ECR](https://aws.amazon.com/ecr/), 
  or by your local computer.

- **Object Storage Service**:

  This storage is used to store the projects deployed from the
  [Estelar CLI](https://github.com/bitmakerla/bitmaker-cli).
  The storage cab be managed by a cloud provider, e.g. [S3](https://aws.amazon.com/s3/),
  or by your local computer, e.g.[MinIO](https://min.io/).

- **Queuing Platform**:

  This platform controls real-time data feeds in a producer-consumer architecture.
  The default platform is Kafka, but any other platform can be used (soon).
  The queuing service can be deployed within the container orchestrator system,
  or in your local computer.

### Local Deployment of Resources

All the named resources (except the _Document Oriented Database_) can be started locally 
by running:

```bash
$ make resources
```

The MongoDB database can be deployed on MongoDB Atlas for 
[free](https://www.mongodb.com/free-cloud-database).

## Environment Variables

Refer to the Helm installation guide, and complete the `values.yaml` file with the 
appropriate values.

## Helm Deployment

The images of each of the Estelar modules must be built and uploaded to the registry, 
make sure to do this step previously, the names of each of the images is as follows:

If you are using a local registry, you can build and upload the images by running:

```bash
$ make images
```

Now, do refer to the Helm installation guide, and deploy Estelar inside kubernetes.
For further help, please read the [official documentation](https://bitmaker.la/docs/).
