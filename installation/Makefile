API_DIR = ../bitmaker-api
QUEUING_DIR = ../bitmaker-queuing


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
	-$(DOCKER_COMPOSE) up -d
	-. .env && minikube start --insecure-registry $${HOST_IP}


.PHONY: build-all-images
build-all-images:
	-cd $(API_DIR) && \
	 docker build . --file docker-conf/Dockerfile-django-api --tag localhost:5000/bitmaker-django-api:latest && \
	 docker build . --file docker-conf/Dockerfile-celery-worker --tag localhost:5000/bitmaker-celery-worker:latest && \
	 docker build . --file docker-conf/Dockerfile-celery-beat --tag localhost:5000/bitmaker-celery-beat:latest && \
	 docker build . --file docker-conf/Dockerfile-redis --tag localhost:5000/bitmaker-redis:latest && \
	 docker build . --file docker-conf/Dockerfile-build-project --tag localhost:5000/bitmaker-build-project:latest
	-cd $(QUEUING_DIR) && \
	 docker build . --tag localhost:5000/bitmaker-consumer:latest


.PHONY: upload-all-images
upload-all-images:
	-docker push localhost:5000/bitmaker-django-api:latest
	-docker push localhost:5000/bitmaker-celery-beat:latest
	-docker push localhost:5000/bitmaker-celery-worker:latest
	-docker push localhost:5000/bitmaker-redis:latest
	-docker push localhost:5000/bitmaker-build-project:latest
	-docker push localhost:5000/bitmaker-consumer:latest


.PHONY: images
images: build-all-images upload-all-images
