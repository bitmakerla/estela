---
layout: page
title: Values Yaml File Example
parent: installation
---

# `values.yaml` file example
The following file is a valid example of helm-variables for _estela local installation_, sensitive variables such as `EMAIL_HOST_PASSWORD` are completed with dummy values.  
Note that variables that have a comment next to it, such as `KAFKA_HOSTS: kafka # kafka` for example, take the value of the comment.

```yaml
#################### CHART VARIABLES ####################

local: true
hostIp: 192.168.49.1
registryHost: 192.168.49.1:5000
nodeSelector: ""

#################### CLOUD VARIABLES ####################

######## AWS ########

AWS_ACCESS_KEY_ID: ""
AWS_SECRET_ACCESS_KEY: ""
AWS_DEFAULT_REGION: ""

awsRegistry: ""
imagePullSecrets: ""

#################### ESTELA VARIABLES ####################

############ GLOBAL ############

# Database
SPIDERDATA_DB_ENGINE: mongodb
SPIDERDATA_DB_CONNECTION: mongodb+srv://estela_admin:<password>@estelamongo.2vbcxpf.mongodb.net/?retryWrites=true&w=majority # Url connection for mongoDB Atlas database, choose Driver:Python, Version: 3.6 or later see Variables Guide
SPIDERDATA_DB_CERTIFICATE_PATH: config/ca-certificate.crt # Leave this as it was if you do not use a certificate

# Kafka
KAFKA_HOSTS: kafka # kafka
KAFKA_PORT: 9092 # 9092

############ API ############

# Database
DB_HOST: database # database
DB_PORT: 3306 # 3306
DB_NAME: estela # estela
DB_USER: django-api # django-api
DB_PASSWORD: estela12345 # estela12345

# Registry
REGISTRY_HOST: 192.168.49.1:5000 # You can also use it between ""
REGISTRY_ID: ""
REPOSITORY_NAME: estela-projects # estela-projects
BUCKET_NAME_PROJECTS: estela-api-projects # estela-api-projects, You can also use it between ""

# Settings
SECRET_KEY: "!v)xih0g07j#j(rdzqih*6uwf5-!w$ncij(kb(_9+pwk6vvqh^" # Check this: https://djecrety.ir/
DJANGO_SETTINGS_MODULE: config.settings.local # config.settings.local
ENGINE: kubernetes # kubernetes
CREDENTIALS: local # local
CORS_ORIGIN_WHITELIST: http://localhost:3000 # You can also use it between ""
DJANGO_API_HOST: dummy

# Celery
CELERY_BROKER_URL: redis://estela-redis-service
CELERY_RESULT_BACKEND: redis://estela-redis-service:6379/0

# Mailing
EMAIL_HOST: http://smtp.gmail.com # http://smtp.gmail.com
EMAIL_PORT: 587 # 587
EMAIL_HOST_USER: test@email.com # This is only a test email, choose your own 
EMAIL_HOST_PASSWORD: email123 # This is only a test password
EMAILS_TO_ALERT: alert@email.com # This is only a test email, choose your own
VERIFICATION_EMAIL: alert@email.com # This is only a test email, choose your own
REGISTER: "True" # "True"

############ QUEUEING ############

KAFKA_CONSUMER_PRODUCTION: "False" # "False"

WORKER_POOL: ""
HEARTBEAT_TICK: ""
QUEUE_BASE_TIMEOUT: ""
QUEUE_MAX_TIMEOUT: ""

SIZE_THRESHOLD: ""
INSERT_TIME_THRESHOLD: ""
ACTIVITY_TIME_THRESHOLD: ""
```