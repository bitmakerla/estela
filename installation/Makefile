API_DIR = ../estela-api
QUEUING_DIR = ../queueing
WEB_DIR = ../estela-web
API_POD = $$(kubectl get pod -l app=estela-django-api -o jsonpath="{.items[0].metadata.name}")
API_IP = $$(kubectl get services -n $${NAMESPACE} estela-django-api-service --output jsonpath='{.status.loadBalancer.ingress[0].ip}')


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
	-. ./.env && minikube start \
	           --feature-gates="TTLAfterFinished=true" \
		   --insecure-registry $${HOST_REGISTRY}
	-minikube addons enable metrics-server


.PHONY: build-all-images
build-all-images:
	-. ./.env && cd $(API_DIR) && \
	 docker build .. --file docker-conf/Dockerfile-django-api --tag $${LOCAL_REGISTRY}/estela-django-api:latest && \
	 docker build .. --file docker-conf/Dockerfile-celery-worker --tag $${LOCAL_REGISTRY}/estela-celery-worker:latest && \
	 docker build .. --file docker-conf/Dockerfile-celery-beat --tag $${LOCAL_REGISTRY}/estela-celery-beat:latest && \
	 docker build . --file docker-conf/Dockerfile-redis --tag $${LOCAL_REGISTRY}/estela-redis:latest && \
	 docker build .. --file docker-conf/Dockerfile-build-project --tag $${LOCAL_REGISTRY}/estela-build-project:latest
	-. ./.env && cd $(QUEUING_DIR) && \
	 docker build .. --file Dockerfile --tag $${LOCAL_REGISTRY}/estela-consumer:latest


.PHONY: upload-all-images
upload-all-images:
	-. ./.env && docker push $${LOCAL_REGISTRY}/estela-django-api:latest
	-. ./.env && docker push $${LOCAL_REGISTRY}/estela-celery-beat:latest
	-. ./.env && docker push $${LOCAL_REGISTRY}/estela-celery-worker:latest
	-. ./.env && docker push $${LOCAL_REGISTRY}/estela-redis:latest
	-. ./.env && docker push $${LOCAL_REGISTRY}/estela-build-project:latest
	-. ./.env && docker push $${LOCAL_REGISTRY}/estela-consumer:latest


.PHONY: images
images: build-all-images upload-all-images


.PHONY: install
install:
	-. ./.env && cd helm-chart && \
	 helm install $${RELEASE_NAME} --create-namespace --debug --namespace=$${NAMESPACE} .


.PHONY: uninstall
uninstall:
	-. ./.env && cd helm-chart && helm uninstall $${RELEASE_NAME} -n $${NAMESPACE}


.PHONY: update-api-ip
update-api-ip:
	-. ./.env && cd helm-chart && \
	 helm upgrade --install $${RELEASE_NAME} . --set DJANGO_API_HOST=$(API_IP) -n $${NAMESPACE}
	-. ./.env && kubectl rollout restart deploy estela-django-api -n $${NAMESPACE}


.PHONY: restart-celery-beat
restart-celery-beat:
	-. ./.env && kubectl rollout restart deploy estela-celery-beat -n $${NAMESPACE}


.PHONY: makemigrations
makemigrations:
	-kubectl exec $(API_POD) -- python manage.py makemigrations


.PHONY: migrate
migrate:
	-kubectl exec $(API_POD) -- python manage.py migrate


.PHONY: createsuperuser
createsuperuser:
	-kubectl exec --stdin --tty $(API_POD) -- python manage.py createsuperuser


.PHONY: build-web
build-web:
	-. ./.env && cd $(WEB_DIR) && \
	 echo "REACT_APP_API_BASE_URL=http://$(API_IP)" > .env.local
	-cd $(WEB_DIR) && yarn install


.PHONY: run-web
run-web:
	-cd $(WEB_DIR) && yarn dev


.PHONY: start
start:
	-minikube start
	-$(DOCKER_COMPOSE) up -d


.PHONY: stop
stop:
	-minikube stop
	-$(DOCKER_COMPOSE) down
