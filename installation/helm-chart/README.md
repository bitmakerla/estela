# estela Helm Chart

## Understanding the variables

First, make a copy of `values.yaml.example` and rename it to `values.yaml`.
Then, complete the following fields:

_Note_: The values that should be used if the resources have been deployed locally are
commented in the `values.yaml.example` file. If you do not need to define an optional 
variable, fill its value with an empty string `""`.

### Chart variables

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
  the Kubernetes cluster has multiple nodes. Use the format `{ roles: NODE_ROL_NAME }`.

### estela module variables

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

* _<DJANGO\_API\_HOST>_: The endpoint of the Django API. This value will be filled later,
  after the application installation, do not change this value yet.

* _<AWS\_DEFAULT\_REGION>_: (Optional) Default region of your aws account.

* _<REGISTRY\_ID>_: (Optional) Fill this values if you registry has an associated ID.

The following values need to be in base64, you can use an
[online tool](https://www.base64encode.org/) or your terminal with
`printf "<TEXT>" | base64`:

* _<DB\_USER>_: User name of the API module database.

* _<DB\_PASSWORD>_: Password of the user above.

* _<MONGO\_CONNECTION>_: The connection URL to your MongoDB instance.

* _<EMAIL\_HOST\_USER>_: The user using the SMTP email service.

* _<EMAIL\_HOST\_PASSWORD>_: Password of the user above.

* _<SECRET\_KEY>_: The Django secret key, you can generate one [here](https://djecrety.ir/).

* _<AWS\_ACCESS\_KEY\_ID>_ and _<AWS\_SECRET\_ACCESS\_KEY>_: (Optional) Your aws credentials.

## Installing the application

1. Once all the values are filled in, we proceed to execute the first install:

   ```
   $ helm install <RELEASE_NAME> --create-namespace --debug --namespace=<NAMESPACE> .
   ```
   
   You can use any value for `<RELEASE_NAME>` and `<NAMESPACE>`, just make sure you remember 
   the `<RELEASE_NAME>` so you can modify or uninstall the app later.

2. Now you can get the ip of the loadBalancer:
   ```
   $ kubectl get services -n <NAMESPACE> estela-django-api-service --output jsonpath='{.status.loadBalancer.ingress[0].ip}'
   ```
   
   _Note_: If you are using Minikube, you need an external IP for the Django service, please 
   run first this command in a new terminal.
   
   ```
   $ minikube tunnel
   ```

3. Now, upgrade the API module with the previous value of the <LOADBALANCER\_IP>:

   ```
   $ helm upgrade --install <RELEASE_NAME> . --set DJANGO_API_HOST=<LOADBALANCER_IP> -n <NAMESPACE>
   ```

4. To apply the changes, roll-out the estela API deployment:

   ```
   $ kubectl rollout restart deploy estela-django-api -n <NAMESPACE>
   ```

5. Now, you can perform the migrations and create a super user for Django admin:

   ```
   $ kubectl exec <API_POD> -- python manage.py migrate
   $ kubectl exec --stdin --tty <API_POD> -- python manage.py createsuperuser
   ```

## Uninstalling the application

To uninstall estela, just run: 

```
$ helm uninstall <RELEASE_NAME> -n <NAMESPACE>
```
