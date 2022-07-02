# estela Helm Chart variables guide

First, make a copy of `values.yaml.example` and rename it to `values.yaml`.
Then, complete the following fields:

_Note_: The values that should be used if the resources have been deployed locally are
commented in the `values.yaml.example` file. If you do not need to define an optional 
variable, fill its value with an empty string `""`.

## Chart variables

* _local_: Set this variable to `true` if estela is being deployed on local resources.

* _hostIp_: (Optional) Fill this variable only if the variable _local_ has been set to 
  `true`, this address is a reference to the host machine from minikube. Find it by running:
  ```bash
  $ minikube ssh 'grep host.minikube.internal /etc/hosts | cut -f1'
  ```

* _registryHost_: The registry host where are the images of the estela modules. If a local
  registry is being used, do not forget to include the port.
  
* _awsRegistry_: Set this variable to `true` if the registry is being hosted in AWS.

* _imagePullSecrets_: (Optional) Fill this variable only if the variable _awsRegistry_ 
  has been set to `true`. Use the value `[ name: regcred ]`.

* _nodeSelector_: (Optional) The name of the node on which estela will be installed in case
  the Kubernetes cluster has multiple nodes. Use the format `{ roles: NODE_ROLE_NAME }`.

## estela module variables

The variables that already have an assigned value should not be modified.

* _<DB\_HOST>_: Host of the API module database.

* _<DB\_PORT>_: Port of the API module database.

* _<DB\_NAME>_: Database name used by the API module.

* _<REGISTRY\_HOST>_: Address of the registry used by the API module.

* _<RESPOSITORY\_NAME>_: Name of the image repository used by the API module to store
  the project's images.

* _<CORS\_ORIGIN\_WHITELIST>_: List of origins authorized to make requests to the API module.

* _<KAFKA\_HOSTS>_: Host of Kafka service.

* _<KAFKA\_PORT>_: Port of Kafka service.

* _\<STAGE\>_: Stage of the API module, it can be DEVELOPMENT or PRODUCTION.

* _<DJANGO\_SETTING\_MODULE>_: Path of the settings file that will be used by the API module.

* _<CELERY\_BROKER\_URL>_: Url of the API module celery broker.

* _<CELERY\_RESULT\_BACKEND>_: Url to store the results from the API module tasks.

* _<BUCKET\_NAME\_PROJECTS>_: Name of the bucket used to store the project files.

* _\<ENGINE\>_: The [engine]() used by the API module.

* _\<CREDENTIALS\>_: The [credentials]() used by the API module.

* _<EMAIL\_HOST>_: Host of the SMTP email server.

* _<EMAIL\_PORT>_: Port of the SMTP email server.

* _<EMAILS\_TO\_ALERT>_: Email address that will receive a notification when a new user 
  is created.

* _<VERIFICATION\_EMAIL>_: Email address that will send the verification emails.

* _\<REGISTER\>_: Set this value to `"False"` to disable the user registration.

* _<SPIDERDATA\_DB\_ENGINE>_: Database engine where the data produced by the spiders
  is stored.

* _<SPIDERDATA\_DB\_CERTIFICATE\_PATH>_: Path where the above database certificate is 
  located. This value will be taken into account if your connection requires a certificate.

* _<DJANGO\_API\_HOST>_: The endpoint of the Django API. This value will be filled later,
  after the application installation, do not change this value yet.
  
* _<KAFKA\_CONSUMER\_PRODUCTION>_: Set this value to `"False"` if the database used by the
  consumers in the Queuing module does not require a certificate for the connection.

* _<AWS\_DEFAULT\_REGION>_: (Optional) Default region of your aws account.

* _<REGISTRY\_ID>_: (Optional) Fill this values if you registry has an associated ID.

The following values need to be in base64, you can use an
[online tool](https://www.base64encode.org/) or your terminal with
`printf "<TEXT>" | base64`:

* _<DB\_USER>_: User name of the API module database.

* _<DB\_PASSWORD>_: Password of the user above.

* _<SPIDERDATA\_DB\_CONNECTION>_: The connection URL to your database instance used to 
  retrieve the data from the spiders.

* _<EMAIL\_HOST\_USER>_: The user using the SMTP email service.

* _<EMAIL\_HOST\_PASSWORD>_: Password of the user above.

* _<SECRET\_KEY>_: The Django secret key, you can generate one [here](https://djecrety.ir/).

* _<AWS\_ACCESS\_KEY\_ID>_ and _<AWS\_SECRET\_ACCESS\_KEY>_: (Optional) Your aws credentials.
