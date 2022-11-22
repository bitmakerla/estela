API_DIR = ../estela-api
QUEUING_DIR = ../queueing
WEB_DIR = ../estela-web
API_POD = $$(kubectl get pod -l app=estela-django-api -o jsonpath="{.items[0].metadata.name}")
API_IP = $$(kubectl get services -n $${NAMESPACE} estela-django-api-service --output jsonpath='{.status.loadBalancer.ingress[0].ip}')
RESOURCES = db registry minio zookeeper kafka


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
	-python3 local/start-environment.py
	-$(DOCKER_COMPOSE) -f local/docker-compose.yaml up ${RESOURCES} -d
	-minikube delete
	-. ./local/.env && minikube start \
		   --insecure-registry=$${HOST_REGISTRY} \
		   --cpus="2" \
                   --memory="2500mb" \
		   --disk-size="20000mb"
	-minikube addons enable metrics-server


.PHONY: build-all-images
build-all-images:
	-. ./local/.env && cd $(API_DIR) && \
	 docker build .. --file docker-conf/Dockerfile-django-api --tag $${LOCAL_REGISTRY}/estela-django-api:latest && \
	 docker build .. --file docker-conf/Dockerfile-celery-worker --tag $${LOCAL_REGISTRY}/estela-celery-worker:latest && \
	 docker build .. --file docker-conf/Dockerfile-celery-beat --tag $${LOCAL_REGISTRY}/estela-celery-beat:latest && \
	 docker build . --file docker-conf/Dockerfile-redis --tag $${LOCAL_REGISTRY}/estela-redis:latest && \
	 docker build .. --file docker-conf/Dockerfile-build-project --tag $${LOCAL_REGISTRY}/estela-build-project:latest
	-. ./local/.env && cd $(QUEUING_DIR) && \
	 docker build .. --file Dockerfile --tag $${LOCAL_REGISTRY}/estela-consumer:latest


.PHONY: upload-all-images
upload-all-images:
	-. ./local/.env && docker push $${LOCAL_REGISTRY}/estela-django-api:latest
	-. ./local/.env && docker push $${LOCAL_REGISTRY}/estela-celery-beat:latest
	-. ./local/.env && docker push $${LOCAL_REGISTRY}/estela-celery-worker:latest
	-. ./local/.env && docker push $${LOCAL_REGISTRY}/estela-redis:latest
	-. ./local/.env && docker push $${LOCAL_REGISTRY}/estela-build-project:latest
	-. ./local/.env && docker push $${LOCAL_REGISTRY}/estela-consumer:latest


.PHONY: images
images: build-all-images upload-all-images


.PHONY: install
install:
	-. ./local/.env && cd helm-chart && \
	 helm install $${RELEASE_NAME} --create-namespace --debug --namespace=$${NAMESPACE} .


.PHONY: uninstall
uninstall:
	-. ./local/.env && cd helm-chart && helm uninstall $${RELEASE_NAME} -n $${NAMESPACE}


.PHONY: update-api-ip
update-api-ip:
	-. ./local/.env && cd helm-chart && \
	 helm upgrade --install $${RELEASE_NAME} . --set DJANGO_API_HOST=$(API_IP) -n $${NAMESPACE}
	-. ./local/.env && kubectl rollout restart deploy estela-django-api -n $${NAMESPACE}
	-. ./local/.env && kubectl wait deployment -n $${NAMESPACE} estela-django-api --for condition=Available=True --timeout=600s
	-sleep 10


.PHONY: restart-celery-beat
restart-celery-beat:
	-. ./local/.env && kubectl rollout restart deploy estela-celery-beat -n $${NAMESPACE}


.PHONY: create-minio-superuser
create-minio-superuser:
	-kubectl exec $(API_POD) -- bash -c \
	 "echo \"from django.contrib.auth.models import User; User.objects.create_superuser('deploy_manager', '', 'estela12345')\" | python manage.py shell"


.PHONY: makemigrations
makemigrations:
	-kubectl exec $(API_POD) -- python manage.py makemigrations


.PHONY: migrate
migrate:
	-kubectl exec $(API_POD) -- python manage.py migrate


.PHONY: createsuperuser
createsuperuser:
	-kubectl exec --stdin --tty $(API_POD) -- python manage.py createsuperuser


.PHONY: setup
setup: update-api-ip makemigrations migrate restart-celery-beat create-minio-superuser


.PHONY: build-web
build-web:
	-. ./local/.env && cd $(WEB_DIR) && \
	 echo "REACT_APP_API_BASE_URL=http://$(API_IP)" > .env.local
	-cd $(WEB_DIR) && yarn install


.PHONY: run-web
run-web:
	-cd $(WEB_DIR) && yarn start


.PHONY: start
start:
	-$(DOCKER_COMPOSE) -f local/docker-compose.yaml up ${RESOURCES} -d
	-minikube start


.PHONY: stop
stop:
	-minikube stop
	-$(DOCKER_COMPOSE) -f local/docker-compose.yaml stop
