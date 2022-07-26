---
layout: page
title: Main Guide
parent: Installation
grand_parent: estela
---

# estela Installation Guide

The installation can be divided into four parts:

1. Set the needed resources to run estela.
2. Set the environment variables to configure estela.
3. Deploy the estela modules with Helm.
4. Build and run the estela web application.

Currently, estela is a kubernetes application, but it can be installed on different 
architectures (soon).

## Requirements

- Docker v20.10.x with *docker-compose*
- Kubectl >= v1.23.x
- Helm >= v3.9.x
- yarn v1.22.x
- node v14.x

Extra requirements needed for local installation:

- Python v3.6.x
- Minikube >= v1.25.0

For the rest of the installation, open a terminal in the _installation_ folder
of the cloned [estela repository](https://github.com/bitmakerla/estela).

## Resources

We must have all the needed resources up and running. Here is the detailed list:

- **Container Orchestrator System**: 

  This system is used to manage the execution of the scrapy jobs, as well as the management
  of the services and deployments of the API module and the Queuing module.
  estela was thought to work with Kubernetes, but any other orchestrator can be used (soon).
  The system can be managed by a cloud provider, e.g., [EKS](https://aws.amazon.com/eks/),
  or by your local computer, e.g., [minikube](https://minikube.sigs.k8s.io/).

- **SQL Relational Database**:

  This database is used to store the metadata of the API module. The default relational 
  database management system is MySQL, but any other manager can be used (soon).
  The database can be managed by a cloud provider, e.g., [RDS](https://aws.amazon.com/rds/),
  or by your local computer.

- **Document Oriented Database**:

  This database is used to store all the data collected from the spiders. The default
  database management system is MongoDB, but any other manager can be used (soon).
  The database can be managed by a cloud provider,
  e.g., [MongoDB Atlas](https://www.mongodb.com/cloud/atlas),
  or by your local computer.

- **Docker Container Registry**:

  This registry is used to store the Docker images of the API module and the Queuing module.
  The registry can be managed by a cloud provider, e.g., [ECR](https://aws.amazon.com/ecr/),
  or by your local computer.

- **Object Storage Service**:

  This storage is used to store the projects deployed from the
  [estela CLI](https://github.com/bitmakerla/estela-cli).
  The storage can be managed by a cloud provider, e.g., [S3](https://aws.amazon.com/s3/),
  or by your local computer, e.g., [MinIO](https://min.io/).

- **Queuing Platform**:

  This platform controls real-time data feeds in a producer-consumer architecture.
  The default platform is Kafka, but any other platform can be used (soon).
  The queuing service can be deployed within the container orchestrator system,
  or in your local computer.
  
- **SMTP Email Server**:

  This server is used to send confirmation emails after creating an account through the 
  web interface. The SMTP server can be dedicated, e.g.,
  [SES](https://aws.amazon.com/ses/); or public, e.g.,
  [Google SMTP server](https://support.google.com/a/answer/176600?hl=en).

### Local Deployment of Resources

All the named resources (except the _Document Oriented Database_ and the _SMTP Email Server_)
can be started locally by running:

```bash
$ make resources
```

To allow the use of images stored in the local container registry, you need to
add the following line to the Docker daemon 
[config file](https://docs.docker.com/config/daemon/#configure-the-docker-daemon).
And then restart Docker.

```json
{
	...
	"insecure-registries" : [ "<HOST_IP>:5000" ]
	...
}
```
Where _<HOST\_IP>_ is equal to the result of:

```bash
$ minikube ssh 'grep host.minikube.internal /etc/hosts | cut -f1'
```

The MongoDB database can be deployed on MongoDB Atlas for
[free](https://www.mongodb.com/free-cloud-database).
To configure the use of a public SMTP server, please read the following
[guide](https://kinsta.com/blog/gmail-smtp-server/). Nothing needs to be configured,
just use the Google services and your Gmail account credentials.

## Environment Variables

Refer to the Helm Chart
[variables guide]({% link estela/installation/helm-variables.md %}),
and complete the `values.yaml` file with the 
appropriate values.

## Helm Deployment

The images of each of the estela modules must be built and uploaded to the Docker
Container Registry, make sure to do this step before installing the Helm application.

If you are using a local registry, you can build and upload the images by running:

```bash
$ make images
```

### Installing the Helm application

If you are using local resources, a `.env` file should have been created, if not, 
create a new one. Open the file and add the following lines:

```
RELEASE_NAME=<RELEASE_NAME>
NAMESPACE=<NAMESPACE>
```

You can use any value for `<RELEASE_NAME>` and `<NAMESPACE>`. However, to avoid writing 
the namespace every time you use kubectl, you can set `NAMESPACE=default`.

1. Install the helm application:

   ```
   $ make install
   ```

2. If you are using Minikube, you need an external IP for the Django service, please 
   run this command in a new terminal:

   ```
   $ minikube tunnel
   ```

3. Update the application with the value of the Django service external IP:

   ```
   $ make update-api-ip
   ```

4. Now, you can perform the migrations and create a super user for Django admin:

   ```
   $ make makemigrations
   $ make migrate
   $ make createsuperuser
   ```

5. Once you do the migrations, restart the `estela-celery-beat` deployment:

   ```bash
   $ make restart-celery-beat
   ```

6. Finally, create a new superuser named `deploy_manager`. This user is required
   for the deployment of projects to work correctly. Use the following command
   to create it:

   ```
   $ make createsuperuser
   ```

   The `deploy_manager`'s password can be set to anything. Just make sure that
   the name is set correctly.

The estela application is ready!

### Uninstalling the Helm application

To uninstall estela, just run:

```
$ make uninstall
```

## estela Web Deployment

To build the estela web application, run:

```bash
$ make build-web
```

Then, execute the web application locally:

```bash
$ make run-web
```

Visit the [web application](http://localhost:3000/login) and start creating projects!

## Final Notes

If you have installed estela locally, you do not need to repeat all the steps every time 
you reboot your computer. Once the installation is done, you can start the application 
and the resources with:

```bash
$ make start
$ minikube tunnel # Run this in another terminal
```

And stop the application along with all the resources with:

```bash
$ make stop
```

If you are using the local resources, specifically MinIO, you need to create a 
public bucket with the name specified in the _BUCKET\_NAME\_PROJECTS_ variable 
(defined in the `values.yaml` file).

* Go to the [web dashboard](http://localhost:9001) and log in using the default
  credentials: `minioadmin:minioadmin`.
  
* Then, [create a bucket](http://localhost:9001/buckets/add-bucket) using the
  _BUCKET\_NAME\_PROJECTS_ value as the bucket name.
  
* Finally, go to the [bucket's page](http://localhost:9001/buckets), click the
  _Manage_ button of the newly created bucket, and change the _Access Policy_
  to _public_.
