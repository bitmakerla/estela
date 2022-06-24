API_DIR = ../bitmaker-api
QUEUING_DIR = ../bitmaker-kafka


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
	-minikube start --feature-gates="TTLAfterFinished=true"
	-echo "HOST_IP=$$(minikube ssh 'grep host.minikube.internal /etc/hosts | cut -f1')" > .env
	-echo "ESTELA_REGISTRY_HOST=localhost:5000" >> .env
	-$(DOCKER_COMPOSE) up -d
	-. .env && minikube start --insecure-registry $${HOST_IP}


.PHONY: build-all-images
build-all-images:
	-. .env && cd ${API_DIR} && \
	 docker build .. --file docker-conf/Dockerfile-django-api --tag $${ESTELA_REGISTRY_HOST}/bitmaker-django-api:latest && \
	 docker build .. --file docker-conf/Dockerfile-celery-worker --tag $${ESTELA_REGISTRY_HOST}/bitmaker-celery-worker:latest && \
	 docker build .. --file docker-conf/Dockerfile-celery-beat --tag $${ESTELA_REGISTRY_HOST}/bitmaker-celery-beat:latest && \
	 docker build . --file docker-conf/Dockerfile-redis --tag $${ESTELA_REGISTRY_HOST}/bitmaker-redis:latest && \
	 docker build . --file docker-conf/Dockerfile-build-project --tag $${ESTELA_REGISTRY_HOST}/bitmaker-build-project:latest
	-. .env && cd ${QUEUING_DIR} && \
	 docker build .. --file Dockerfile --tag $${ESTELA_REGISTRY_HOST}/bitmaker-consumer:latest


.PHONY: upload-all-images
upload-all-images:
	-. .env && docker push $${ESTELA_REGISTRY_HOST}/bitmaker-django-api:latest
	-. .env && docker push $${ESTELA_REGISTRY_HOST}/bitmaker-celery-beat:latest
	-. .env && docker push $${ESTELA_REGISTRY_HOST}/bitmaker-celery-worker:latest
	-. .env && docker push $${ESTELA_REGISTRY_HOST}/bitmaker-redis:latest
	-. .env && docker push $${ESTELA_REGISTRY_HOST}/bitmaker-build-project:latest
	-. .env && docker push $${ESTELA_REGISTRY_HOST}/bitmaker-consumer:latest


.PHONY: images
images: build-all-images upload-all-images
