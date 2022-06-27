# estela Installation Guide

The installation can be divided into three parts:

1. Set the needed resources to run estela.
2. Set the environment variables to configure estela.
3. Deploy the estela modules with Helm.

Currently, estela is a kubernetes application, but it can be installed on different 
architectures (soon).

## Requirements

- Docker v20.10.x with *docker-compose*
- Kubectl >= v1.23.x
- Helm >= v3.9.x

Extra requirements needed for local installation:

<!-- - Python v3.6.x -->
- Minikube >= v1.25.0

## Resources

We must have all the needed resources up and running. Here is the detailed list:

- **Container Orchestrator System**: 

  This system is used to manage the execution of the scrapy jobs, as well as the management
  of the services and deployments of the API module and the Queuing module.
  estela was thought to work with Kubernetes, but any other orchestrator can be used (soon).
  The system cab be managed by a cloud provider, e.g. [EKS](https://aws.amazon.com/eks/),
  or by your local computer, e.g. [minikube](https://minikube.sigs.k8s.io/).

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
  [estela CLI](https://github.com/bitmakerla/bitmaker-cli).
  The storage cab be managed by a cloud provider, e.g. [S3](https://aws.amazon.com/s3/),
  or by your local computer, e.g.[MinIO](https://min.io/).

- **Queuing Platform**:

  This platform controls real-time data feeds in a producer-consumer architecture.
  The default platform is Kafka, but any other platform can be used (soon).
  The queuing service can be deployed within the container orchestrator system,
  or in your local computer.
  
- **SMTP Email Server**:

  This server is used to send confirmation emails after creating an account through the 
  web interface. The SMTP server can be dedicated, e.g.
  [SES](https://aws.amazon.com/ses/); or public, e.g.
  [Google SMTP server](https://support.google.com/a/answer/176600?hl=en).

### Local Deployment of Resources

All the named resources (except the _Document Oriented Database_ and the _SMTP Email Server_)
can be started locally by running:

```bash
$ make resources
```

The MongoDB database can be deployed on MongoDB Atlas for
[free](https://www.mongodb.com/free-cloud-database).
To configure the use of a public SMTP server, please read the following
[guide](https://kinsta.com/blog/gmail-smtp-server/). Nothing needs to be configured,
just use the Google services and your Gmail account credentials.

## Environment Variables

Refer to the Helm installation guide, and complete the `values.yaml` file with the 
appropriate values.

## Helm Deployment

The images of each of the estela modules must be built and uploaded to the Docker
Container Registry, make sure to do this step before installing the Helm application

If you are using a local registry, you can build and upload the images by running:

```bash
$ make images
```

Now, do refer to the Helm installation guide, and deploy estela inside kubernetes.
For further help, please read the [official documentation](https://bitmaker.la/docs/).
