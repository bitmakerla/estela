---
layout: default
title: Main Guide
parent: Installation
grand_parent: estela
nav_order: 1
---

# Installation
{: .no_toc}

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

{:% .note }
> Currently, estela is a kubernetes application, but it can be installed on different 
> architectures 🔜.

---

## Requirements

<details markdown="block">
  <summary>
  Docker v20.10.x with docker-compose
  </summary>
 {% tabs requirements %}
  {% tab requirements Ubuntu %}
  You could install using the following command
  ```bash
  $ apt-get install docker kubectl heml yarn node
  ```
  {% endtab %}

  {% tab requirements macOS %}
  ```bash
  $ brew install --cask docker
  $ brew install kubectl helm yarn node
  ```
  {% endtab %}
 {% endtabs %}
</details>
<details markdown="block">
  <summary>
  Kubectl >= v1.23.x
  </summary>
  dsadasdas
 {% tabs requirements %}
  {% tab requirements Ubuntu %}
  ```bash
  $ apt-get install docker kubectl heml yarn node
  ```
  {% endtab %}

  {% tab requirements macOS %}
  ```bash
  $ brew install --cask docker
  $ brew install kubectl helm yarn node
  ```
  {% endtab %}
 {% endtabs %}
</details>
<details markdown="block">
  <summary>
  Helm >= v3.9.x
  </summary>
 dsadasdas
 {% tabs requirements %}
  {% tab requirements Ubuntu %}
  ```bash
  $ apt-get install docker kubectl heml yarn node
  ```
  {% endtab %}

  {% tab requirements macOS %}
  ```bash
  $ brew install --cask docker
  $ brew install kubectl helm yarn node
  ```
  {% endtab %}
 {% endtabs %}
</details>

<details>
<summary>
yarn v1.22.x
</summary>
</details>

<details>
<summary>
node v18.x
</summary>
</details>

Extra requirements needed for local installation:

- Python v3.9.x
- [Minikube >= v1.25.0](https://minikube.sigs.k8s.io/docs/start/){:target="_blank"}  

 {% tabs requirements %}
  {% tab requirements Ubuntu %}
  ```bash
  $ apt-get install docker kubectl heml yarn node
  ```
  {% endtab %}

  {% tab requirements macOS %}
  ```bash
  $ brew install --cask docker
  $ brew install kubectl helm yarn node
  ```
  {% endtab %}
 {% endtabs %}

{: .highlight }
> Please note that command line installation is a reference and some requirements could be
> installed in another ways, *i.e.* Install Docker Desktop in **macOS** to satisfy docker
> requirement: [docker installation docs](https://docs.docker.com/desktop/install/mac-install/){:target="_blank"}

{: .note}
> estela runs on Linux-based and Unix-like operating systems, but you can also use Windows Subsystem for Linux ([WSL](https://learn.microsoft.com/en-us/windows/wsl/install){:target="_blank"}) if you are using Windows.

---

For the rest of the installation, open a terminal in the _installation_ folder
of the cloned [estela repository](https://github.com/bitmakerla/estela){:target="_blank"}.

## Resources

We will set the needed resources to run estela.  All the named resources (except the _Document Oriented Database_ and the _SMTP Email Server_)
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
[resources guide]({% link estela/installation/resources.md %}){:target="_blank"}
to complete this step and have all the needed resources up and running.

---

## Environment Variables
First, make a copy (in the _helm-chart_ directory) of 
[`values.yaml.example`](https://github.com/bitmakerla/estela/tree/main/installation/helm-chart/values.yaml.example){:target="_blank"}
and rename it to `values.yaml`. If you do not need to define an optional 
variable, fill its value with an empty string `""`. Now, complete the following fields:

{:% .note}
The values that should be used if the resources have been deployed locally are
commented in the `values.yaml.example` file.

Refer to the
[variables guide]({% link estela/installation/helm-variables.md %}){:target="_blank"},
and complete the `helm-chart/values.yaml` file with the appropriate environment values.

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

## Uninstalling estela
{: .no_toc}

To uninstall estela, just run:

```
$ make uninstall
```

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
