<h1> Bitmaker API Helm Chart </h1>

<h3> Understanding values </h3>

In values:

- Local: If we deploy in local set in true.
- Endpoint_ip: In case we set Local in true, this is the endpoint to connect with database for django-api.
- config and secrets: The name of configmap and secrets for api.
- registryHost: The registry host of bitmaker api images.

<h3> Install API </h3>

You need to build the api images, celery worker, celery beat and redis. This can be done using the ´make set-up-images´ command in kafka and api directories.

First is necesary complete values in _values.yaml_:

- _<DB\_HOST>_: Host of bitmaker django api database.

- _<DB\_PORT>_: Port of bitmaker django api database.

- _<DB\_NAME>_: Database name for bitmaker django api.

- _<AWS\_DEFAULT\_REGION>_: Region of aws that you use.

- _<REGISTRY\_ID>_: Just if you registry has an ID.

- _<REGISTRY\_HOST>_: Url of you registry.

- _<RESPOSITORY\_NAME>_: Name of image repository for project's images.

- _<CORS\_ORIGIN\_WHITELIST>_: List of origins authorized to make requests

- _<KAFKA\_HOSTS>_: Host of kafka service.

- _<KAFKA\_PORT>_: Port of kafka service.

- _<STAGE\>_: Could be DEVELOPMENT or PRODUCTION.

- _<DJANGO\_SETTING\_MODULE>_: Setting that will be used.

- _<CELERY\_BROKER\_URL>_: Url of celery broker.

- _<CELERY\_RESULT\_BACKEND>_: Store results from tasks. 

The next values need to be in base64:

- _<DB\_USER>_: User name of bitmaker django api database.

- _<DB\_PASSWORD>_: Password for db user.

- _<MONGO\_CONNECTION>_: The connection to Mongo DB formatted in base64 where all the data collected from the spiders is stored.

- _<AWS\_ACCESS\_KEY\_ID>_ and _<AWS\_SECRET\_ACCESS\_KEY>_: Enter your AWS credentials. 

You can use an [online tool](https://www.base64encode.org/) or in a terminal with `printf "<TEXT>" | base64`.

DONT FORGET RELEASE NAME

Once these values are filled in, we proceed to execute the first install:
```
helm install <RELEASE_NAME> --create-namespace --debug --namespace=<NAMESPACE> .
```

<h3> In Minikube </h3>

If you use minikube, you needs run:
```
minikube tunnel
```
Now you get the ip of loadbalancer:
```
kubectl get services -n <NAMESPACE> bitmaker-django-api-service --output jsonpath='{.status.loadBalancer.ingress[0].ip}'
```
And now we upgrade the api with this value, remember API just allow this Ip:
```
helm upgrade --install <RELEASE_NAME> . --set django_api_host=<IP_LOADBALANCER> -n <NAMESPACE>
```
To apply the changes in bitmaker-django-api deployment rollout it:
```
kubectl rollout restart deploy bitmaker-django-api -n <NAMESPACE>
```
To create your super user for django admin:
```
kubectl exec --stdin --tty $(APIPOD) -- python manage.py createsuperuser
```

<h3> Uninstall API </h3>
To uninstall the API: 

```
helm uninstall <RELEASE_NAME> -n <NAMESPACE>
```
