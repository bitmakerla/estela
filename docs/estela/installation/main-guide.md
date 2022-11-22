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

estela runs on Linux-based and Unix-like operating systems, but you can also use Windows Subsystem for Linux ([WSL](https://learn.microsoft.com/en-us/windows/wsl/install){:target="_blank"}) if you are using Windows.

- [Docker v20.10.x with *docker-compose*](https://docs.docker.com/get-docker/){:target="_blank"} 
- [Kubectl >= v1.23.x](https://kubernetes.io/docs/tasks/tools/#kubectl){:target="_blank"}  
- [Helm >= v3.9.x](https://helm.sh/docs/intro/install/){:target="_blank"}  
- [yarn v1.22.x](https://classic.yarnpkg.com/lang/en/docs/install/#debian-stable){:target="_blank"}  
- [node v14.x](https://nodejs.org/){:target="_blank"}  

Extra requirements needed for local installation:

- Python v3.6.x  
- [Minikube >= v1.25.0](https://minikube.sigs.k8s.io/docs/start/){:target="_blank"}  

For the rest of the installation, open a terminal in the _installation_ folder
of the cloned [estela repository](https://github.com/bitmakerla/estela){:target="_blank"}.

## Installation

### 1. Resources

Refer to the 
[resources guide]({% link estela/installation/resources.md %}){:target="_blank"}
to complete this step and have all the needed resources up and running.

### 2. Environment Variables

Refer to the
[variables guide]({% link estela/installation/helm-variables.md %}){:target="_blank"},
and complete the `helm-chart/values.yaml` file with the appropriate environment values.

### 3. Helm Deployment

The images of each of the estela modules must be built and uploaded to the Docker
Container Registry, make sure to do this step before installing the Helm application.

If you are using a local registry, you can build and upload the images by running:

```bash
$ make images
```

The Helm deployment needs a release name and a namespace to identify the current version
of the installed application. By default, the values of these variables are `base` and 
`default` respectively.

Now, perform the following steps:

* Install the helm application:

   ```
   $ make install
   ```

* If you are using Minikube, you need an external IP for the API Django service, please 
  run this command in a new terminal:

  ```
  $ minikube tunnel
  ```

* Now, some settings need to be applied for estela to work properly. For example,
  update the application with the value of the Django service external IP, perform the 
  migrations, and the creation of the needed Django super users.

  ```
  $ make setup
  ```

* If you are using the local resources, specifically MinIO, you need to create a 
  public bucket with the name specified in the 
  [_BUCKET\_NAME\_PROJECTS_]({% link estela/installation/helm-variables.md %}#registry){:target="_blank"}
  variable.
  * Go to the [web dashboard](http://localhost:9001){:target="_blank"} and log in using 
    the default credentials: `minioadmin : minioadmin`.
  * Then, [create a bucket](http://localhost:9001/buckets/add-bucket){:target="_blank"} 
	using the _BUCKET\_NAME\_PROJECTS_ value as the bucket name.
  * Finally, go to the [bucket's page](http://localhost:9001/buckets){:target="_blank"}, 
	click the _Manage_ button of the newly created bucket, and change the _Access Policy_
	to _public_.

* You can create a new super user to manage and use estela.

  ```
  $ make createsuperuser
  ```

The estela application is now ready to use!

### 4. Web Deployment

To build the estela web application, run:

```bash
$ make build-web
```

Then, execute the web application locally:

```bash
$ make run-web
```

Visit the [web application](http://localhost:3000/login){:target="_blank"} and start
creating projects!

## Uninstalling estela

To uninstall estela, just run:

```
$ make uninstall
```

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
