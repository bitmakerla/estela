---
layout: default
title: Installation
parent: Getting started
grand_parent: estela
nav_order: 1
---

# Installation
{: .no_toc}

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

{: .note }
> Currently, estela is a kubernetes application, but it can be installed on different 
> architectures 🔜.

---

## Requirements

#### Docker v.20.10.x with docker-compose
{: .no_toc}
Estela projects are built into docker images and added to Docker-Registry. It is
also necessary to install estela resources.

It is recommended to install `docker-desktop` that includes docker and docker-compose. 
A detailed guide on how to install can be found [here](https://docs.docker.com/get-docker/){:target="_blank"}.

#### Kubectl >= v1.23.x
{: .no_toc}
The Kubernetes command-line tool, kubectl, allows you to run commands against Kubernetes clusters. 

To install `kubectl` you can use following command-line code according your OS:
{% tabs requirements %}
  {% tab requirements macOS %}
  ```bash
  brew install kubectl
  ```
  {% endtab %}
  {% tab requirements Ubuntu %}
  ```bash
  sudo apt-get update
  sudo apt-get install -y ca-certificates curl
  sudo apt-get install -y apt-transport-https
  sudo curl -fsSLo /etc/apt/keyrings/kubernetes-archive-keyring.gpg https://packages.cloud.google.com/apt/doc/apt-key.gpg
  echo "deb [signed-by=/etc/apt/keyrings/kubernetes-archive-keyring.gpg] https://apt.kubernetes.io/ kubernetes-xenial main" | sudo tee /etc/apt/sources.list.d/kubernetes.list
  sudo apt-get update
  sudo apt-get install -y kubectl
  ```
  {% endtab %}
{% endtabs %}

{: .note }
Detailed installation guide can be found [here](https://kubernetes.io/docs/tasks/tools/){:target="_blank"}

#### Helm >= v3.9.x
{: .no_toc}

Helm is a package manager for Kubernetes. 

To install `Helm` you can use the following command-line code according your OS:

{% tabs requirements %}
  {% tab requirements macOS %}
  ```bash
  brew install helm
  ```
  {% endtab %}
  {% tab requirements Ubuntu %}
  ```bash
  curl https://baltocdn.com/helm/signing.asc | gpg --dearmor | sudo tee /usr/share/keyrings/helm.gpg > /dev/null
  sudo apt-get install apt-transport-https --yes
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/helm.gpg] https://baltocdn.com/helm/stable/debian/ all main" | sudo tee /etc/apt/sources.list.d/helm-stable-debian.list
  sudo apt-get update
  sudo apt-get install helm
  ```
  {% endtab %}
{% endtabs %}

#### Node v18.x
{: .no_toc}

Node is an open-source, cross-platform JavaScript runtime environment. 

To install `node` you can use the following command-line code according your OS:

{% tabs requirements %}
  {% tab requirements macOS %}
  ```bash
  brew install node
  ```
  {% endtab %}
  {% tab requirements Ubuntu %}
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - &&\
  sudo apt-get install -y nodejs
  ```
  {% endtab %}
{% endtabs %}

#### Yarn v1.22.x
{: .no_toc}

Yarn is a package manager that doubles down as project manager. 

To install `Yarn` you can just use `npm`:

```bash
npm install --global yarn
```

### Extra requirements
{: .no_toc}

Local installation will require:

#### Python v3.9.x
{: .no_toc}

Please refer to https://www.python.org/downloads/ and install the appropiate version of python
according your SO.

#### Minikube >= v1.25.0
{: .no_toc}

Minikube is used to setup a local Kubernetes cluster.

To install `minikube` you can use the following command-line code: 

{% tabs requirements %}
  {% tab requirements macOS %}
  ```bash
  brew install minikube
  ```
  {% endtab %}
  {% tab requirements Ubuntu %}
  ```bash
  curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
  sudo install minikube-linux-amd64 /usr/local/bin/minikube
  ```
  {% endtab %}
{% endtabs %}

---

You can use the following command-line to check if every requirement is satisfied:
```bash
$ kubectl version --short 2>/dev/null; helm version --short; yarn --version --short; node --version; python --version; minikube version --short; docker --version
```
An example of expected output is the following:
```bash
Client Version: v1.26.1
Kustomize Version: v4.5.7
v3.11.0+g472c573
1.22.19
v19.4.0
Python 3.9.12
v1.28.0
Docker version 20.10.14, build a224086
```

{: .highlight }
> Please note that command line installation is a reference and some requirements could be
> installed in another ways, i.e. using binaries. 

{: .highlight }
> To use the above command-line instructions in macOS you need to install [homebrew](https://brew.sh/)

{: .note}
> estela runs on Linux-based and Unix-like operating systems, but you can also use Windows Subsystem for Linux ([WSL](https://learn.microsoft.com/en-us/windows/wsl/install){:target="_blank"}) if you are using Windows.

---

For the rest of the installation, open a terminal in the _installation_ folder
of the cloned [estela repository](https://github.com/bitmakerla/estela){:target="_blank"}.

## Resources

All the named resources (except the _Document Oriented Database_ and the _SMTP Email Server_)
can be started locally by running this command in the  _installation_ folder:

```bash
$ make resources
```

If you want to start only some of the resources, modify the `RESOURCES` variable of the 
Makefile.

To allow the use of images stored in the local container registry, you need to
add the following line to the Docker daemon 
[config file](https://docs.docker.com/config/daemon){:target="_blank"}.
Then, restart Docker.

```json
{
	...
	"insecure-registries" : [ "<HOST_IP>:5000" ]
	...
}
```
Where _<HOST\_IP>_ is equal to the output of:

```bash
$ minikube ssh 'grep host.minikube.internal /etc/hosts | cut -f1'
```

Please refer to the 
[resources annex]({% link estela/installation/resources.md %}){:target="_blank"}
to have a detailed information of the resources needed by estela.

---

## Environment Variables
First, make a copy (in the _helm-chart_ directory) of 
[`values.yaml.example`](https://github.com/bitmakerla/estela/tree/main/installation/helm-chart/values.yaml.example){:target="_blank"}
and rename it to `values.yaml`. If you do not need to define an optional 
variable, fill its value with an empty string `""`.

Refer to the
[variables annex]({% link estela/installation/helm-variables.md %}){:target="_blank"},
and complete the `helm-chart/values.yaml` file with the appropriate environment values.

{:% .note}
The values that should be used if the resources have been deployed locally are
commented in the `helm-chart/values.yaml.example` file.

---

## Helm Deployment

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

---

## Web Deployment

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

{:% .note }
You can use the superuser credentials that you set with `make createsuperuser` to login the in the [web application](http://localhost:3000/login).


---

## Uninstalling estela
{: .no_toc}

To uninstall estela, just run:

```
$ make uninstall
```

---

## Final Notes
{: .no_toc}

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
