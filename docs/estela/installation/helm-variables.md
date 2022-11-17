---
layout: page
title: Variables Guide
parent: Installation
grand_parent: estela
---

# estela Helm Chart variables guide

First, make a copy (in the _helm-chart_ directory) of 
[`values.yaml.example`](https://github.com/bitmakerla/estela/tree/main/installation/helm-chart/values.yaml.example){:target="_blank"}
and rename it to `values.yaml`. If you do not need to define an optional 
variable, fill its value with an empty string `""`. Now, complete the following fields:

_Note_: The values that should be used if the resources have been deployed locally are
commented in the `values.yaml.example` file, _do not change the commented values_, you can check this [`values.yaml`]({% link estela/installation/values-yaml-example.md %}){:target="_blank"} completed file example to guide yourself.

## Chart variables

These variables define general aspects of the deployment, they do not alter the behavior
of estela.

* _local_ (Required): Set this variable to `true` if estela is being deployed on local
  resources. Otherwise, set it to `false`.

* _hostIp_ (Optional): This variable is required only if the above variable _local_ has 
  been set to `true`, this address is a reference to the host machine from minikube. 
  Find it by running:
  ```bash
  $ minikube ssh 'grep host.minikube.internal /etc/hosts | cut -f1'
  ```

* _registryHost_ (Required): The registry host where the images of the estela modules are 
  located. If a local registry is being used, this host is equal to the above variable
  _hostIp_, remember to add the port where the local images are located `<hostIp>:5000`.

* _nodeSelector_ (Optional): The name of the node on which estela will be installed in case
  the Kubernetes cluster has multiple nodes. Use the format `{ roles: NODE_ROLE_NAME }`.
  
## Cloud provider variables

These variables allow the clean deployment of estela and its resources using cloud providers.

### AWS

If you are not using AWS, skip this section.

* _<AWS\_ACCESS\_KEY\_ID>_ (Required): Your aws access key id.

* _<AWS\_SECRET\_ACCESS\_KEY>_ (Required): Your aws secret access key.

* _<AWS\_DEFAULT\_REGION>_ (Required): Default region of your aws account.

* _awsRegistry_ (Optional): Set this variable to `true` if you are using
  [ECR](https://aws.amazon.com/ecr/){:target="_blank"} to store the estela images.

* _imagePullSecrets_ (Optional): Fill this variable only if the variable _awsRegistry_ 
  has been set to `true`. Use the value `[ name: regcred ]`.

## estela module variables

These variables define the estela behavior.

_Note_: The variables that already have an assigned value should not be modified, unless
you have a deep understanding of estela.

### Global variables

#### Database

* _<SPIDERDATA\_DB\_ENGINE>_ (Required): Document oriented database where the data produced 
  by the spiders is stored. Currently, estela supports the _mongodb_ engine.

* _<SPIDERDATA\_DB\_CONNECTION>_ (Required): The connection URL to your database instance, for easy instantiation you can use [MongoDB Atlas](https://www.mongodb.com/free-cloud-database){:target="_blank"}..

* _<SPIDERDATA\_DB\_CERTIFICATE\_PATH>_ (Required): Path where the database certificate is
  located. This value will be taken into account if your connection requires a certificate, go to [`values.yaml`]({% link estela/installation/values-yaml-example.md %}){:target="_blank"} file example if you don't understand this field.
  
#### Kafka

* _<KAFKA\_HOSTS>_ (Required): Host of the Kafka service.

* _<KAFKA\_PORT>_ (Required): Port of the Kafka service.

### estela API variables

#### Database

* _<DB\_HOST>_ (Required): Host of the SQL relational database.

* _<DB\_PORT>_ (Required): Port of the SQL relational database.

* _<DB\_NAME>_ (Required): Database name used by the API module.

* _<DB\_USER>_ (Required): User name of the SQL relational database.

* _<DB\_PASSWORD>_ (Required): Password of the above user. To avoid reading conflicts, 
  enclose the value in quotes.

#### Registry

* _<REGISTRY\_HOST>_ (Required): Address of the registry used to store the estela projects.
  This value can be equal to the variable _registryHost_.

* _<REGISTRY\_ID>_: (Optional) Fill this values if you registry has an associated ID.

* _<RESPOSITORY\_NAME>_ (Required): Name of the registry repository used to store the
  project images.

* _<BUCKET\_NAME\_PROJECTS>_ (Required): Name of the bucket used to store the project files.

#### Settings

* _<SECRET\_KEY>_ (Required): The Django secret key, you can generate one 
  [here](https://djecrety.ir/){:target="_blank"}. To avoid reading conflicts, enclose 
  the value in quotes.

* _<DJANGO\_SETTING\_MODULE>_ (Required): Path of settings file to use, it can be one of 
  [these files](https://github.com/bitmakerla/estela/tree/main/estela-api/config/settings){:target="_blank"}.
  
* _\<ENGINE\>_ (Required): The [engine]({% link estela/api/engines.md %}){:target="_blank"} 
  used to run the spider jobs.

* _\<CREDENTIALS\>_ (Required): The
  [credentials]({% link estela/api/credentials.md %}){:target="_blank"}
  used by the API.
  
* _<CORS\_ORIGIN\_WHITELIST>_ (Required): List of origins authorized to make requests to
  the API. If estela web will be running locally, set this value to `http://localhost:3000`.
  
* _<DJANGO\_API\_HOST>_: The endpoint of the Django API. This value will be filled later
  after the application installation, do not change this value yet.

#### Celery

* _<CELERY\_BROKER\_URL>_ (Required): Url of the celery broker.

* _<CELERY\_RESULT\_BACKEND>_ (Required): Url to send the results from the API module tasks.

#### Mailing

* _<EMAIL\_HOST>_ (Required): Host of the SMTP email server.

* _<EMAIL\_PORT>_ (Required): Port of the SMTP email server.

* _<EMAIL\_HOST\_USER>_ (Required): The user using the SMTP email service.

* _<EMAIL\_HOST\_PASSWORD>_ (Required): Password of the above user. To avoid reading 
  conflicts, enclose the value in quotes.

* _<EMAILS\_TO\_ALERT>_ (Required): Email address that will receive a notification when a 
  new user is created.

* _<VERIFICATION\_EMAIL>_ (Required): Email address that will send the verification emails.

* _\<REGISTER\>_ (Required): Set this value to `"False"` to disable the user registration.

### estela queueing variables

* _<KAFKA\_CONSUMER\_PRODUCTION>_ (Required): Set this value to `"False"` if the database
  used by the consumers does not require a certificate for the connection. Otherwise, set it
  to `"True"`.
  
* _<WORKER\_POOL>_ (Optional): Number of worker threads per consumer, it must be an integer.
  If the variable is left blank, the default value is 10.

* _<HEARTBEAT\_TICK>_ (Optional): Number of seconds between heartbeat inspections, it must
  be an integer. If the variable is left blank, the default value is 300.

* _<QUEUE\_BASE\_TIMEOUT>_ (Optional): Minimum number of seconds a worker thread can wait 
  for an item to be available in the internal item queue, it must be an integer. If the 
  variable is left blank, the default value is 5.

* _<QUEUE\_MAX\_TIMEOUT>_ (Optional): Maximum number of seconds a worker thread can wait 
  for an item to be available in the internal item queue, it must be an integer. If the 
  variable is left blank, the default value is 300.

* _<BATCH\_SIZE\_THRESHOLD>_ (Optional): Size threshold in bytes of the data batch to be
  inserted, it must be an integer. If the variable is left blank, the default value is 4096.

* _<INSERT\_TIME\_THRESHOLD>_ (Optional): Time threshold in seconds of the insertion of 
  consecutive items belonging to the same batch of data, it must be an integer. If the 
  variable is left blank, the default value is 5.

* _<ACTIVITY\_TIME\_THRESHOLD>_ (Optional): Time threshold in seconds of the activity time 
  of an Inserter object before being cleaned up, it must be an integer. If the variable is 
  left blank, the default value is 600.
