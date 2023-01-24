---
layout: page
title: Resources Annex
parent: Getting started
grand_parent: estela
---

# estela Resources Guide

estela needs the following resources to run:

- **Container Orchestrator System**:

  This system is used to manage the execution of the scrapy jobs, as well as the management
  of the services and deployments of the API module and the Queuing module.
  estela was thought to work with Kubernetes, but any other orchestrator can be used (soon).
  The system can be managed by a cloud provider, e.g., 
  [EKS](https://aws.amazon.com/eks/){:target="_blank"}, or by your local computer, e.g., 
  [minikube](https://minikube.sigs.k8s.io/){:target="_blank"}.

- **SQL Relational Database**:

  This database is used to store the metadata of the API module. The default relational 
  database management system is MySQL, but any other manager can be used (soon).
  The database can be managed by a cloud provider, e.g., 
  [RDS](https://aws.amazon.com/rds/){:target="_blank"}, or by your local computer.

- **Document Oriented Database**:

  This database is used to store all the data collected from the spiders. The default
  database management system is MongoDB, but any other manager can be used (soon).
  The database can be managed by a cloud provider,
  e.g., [MongoDB Atlas](https://www.mongodb.com/cloud/atlas){:target="_blank"},
  or by your local computer.

- **Docker Container Registry**:

  This registry is used to store the Docker images of the API module and the Queuing module.
  The registry can be managed by a cloud provider, e.g., 
  [ECR](https://aws.amazon.com/ecr/){:target="_blank"}, or by your local computer.

- **Object Storage Service**:

  This storage is used to store the projects deployed from the
  [estela CLI](https://github.com/bitmakerla/estela-cli){:target="_blank"}.
  The storage can be managed by a cloud provider, e.g., 
  [S3](https://aws.amazon.com/s3/){:target="_blank"}, or by your local computer, e.g.,
  [MinIO](https://min.io/){:target="_blank"}.

- **Queuing Platform**:

  This platform controls real-time data feeds in a producer-consumer architecture.
  The default platform is [Kafka](https://kafka.apache.org/){:target="_blank"}, 
  but any other platform can be used (soon). The queuing service can be deployed within 
  the container orchestrator system, or in your local computer.
  
- **SMTP Email Server**:

  This server is used to send confirmation emails after creating an account through the 
  web interface. The SMTP server can be dedicated, e.g.,
  [SES](https://aws.amazon.com/ses/){:target="_blank"}; or public, e.g.,
  [Google SMTP server](https://kinsta.com/blog/gmail-smtp-server/){:target="_blank"}.

## Issues during the process

In case you encounter some issues during the installation process, check out the **estela Installation** section in our [FAQ]({% link FAQ/index.md %}#estela-installation).