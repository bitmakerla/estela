API_DIR = ../estela-api
QUEUING_DIR = ../queueing


ifeq ($(OS),Windows_NT)
	DOCKER_COMPOSE = docker compose
else
	UNAME_S := $(shell uname -s)
	ifeq ($(UNAME_S),Linux)
		DOCKER_COMPOSE = docker-compose
	else # OSX
		DOCKER_COMPOSE = docker compose
	endif
endif


.PHONY: resources
resources:
	-minikube start
	-echo "$$(minikube ssh 'grep host.minikube.internal /etc/hosts | cut -f1')" > tmp
	-python start-environment.py
	-$(DOCKER_COMPOSE) up -d
	-minikube delete
	-. .env && minikube start \
	           --feature-gates="TTLAfterFinished=true" \
		   --insecure-registry $${HOST_REGISTRY}


.PHONY: build-all-images
build-all-images:
	-. .env && cd ${API_DIR} && \
	 docker build .. --file docker-conf/Dockerfile-django-api --tag $${LOCAL_REGISTRY}/estela-django-api:latest && \
	 docker build .. --file docker-conf/Dockerfile-celery-worker --tag $${LOCAL_REGISTRY}/estela-celery-worker:latest && \
	 docker build .. --file docker-conf/Dockerfile-celery-beat --tag $${LOCAL_REGISTRY}/estela-celery-beat:latest && \
	 docker build . --file docker-conf/Dockerfile-redis --tag $${LOCAL_REGISTRY}/estela-redis:latest && \
	 docker build . --file docker-conf/Dockerfile-build-project --tag $${LOCAL_REGISTRY}/estela-build-project:latest
	-. .env && cd ${QUEUING_DIR} && \
	 docker build .. --file Dockerfile --tag $${LOCAL_REGISTRY}/estela-consumer:latest


.PHONY: upload-all-images
upload-all-images:
	-. .env && docker push $${LOCAL_REGISTRY}/estela-django-api:latest
	-. .env && docker push $${LOCAL_REGISTRY}/estela-celery-beat:latest
	-. .env && docker push $${LOCAL_REGISTRY}/estela-celery-worker:latest
	-. .env && docker push $${LOCAL_REGISTRY}/estela-redis:latest
	-. .env && docker push $${LOCAL_REGISTRY}/estela-build-project:latest
	-. .env && docker push $${LOCAL_REGISTRY}/estela-consumer:latest


.PHONY: images
images: build-all-images upload-all-images
