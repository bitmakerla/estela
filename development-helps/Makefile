ROOT_DIR = ..
API_DIR = ../estela-api
QUEUING_DIR = ../queueing
WEB_DIR = ../estela-web
INSTALLATION_DIR = ../installation

REGISTRY_HOST = localhost:5001
API_POD = $$(kubectl get pod -l app=estela-django-api -o jsonpath="{.items[0].metadata.name}")
API_DOC = docs/api.yaml
PLATFORM ?= linux/$(shell uname -m)
APPLE_SILICON_LOCAL ?= false

.PHONY: start
start:
	-cd $(INSTALLATION_DIR) && make start


.PHONY: stop
stop:
	-cd $(INSTALLATION_DIR) && make stop


.PHONY: update-api-image
update-api-image:
	-cd $(API_DIR) && \
	 docker build ..  --build-arg APPLE_SILICON_LOCAL=${APPLE_SILICON_LOCAL} --file docker-conf/Dockerfile-django-api --tag  $(REGISTRY_HOST)/estela-django-api:latest  --platform $(PLATFORM)
	-docker push $(REGISTRY_HOST)/estela-django-api:latest


.PHONY: update-celery-image
update-celery-image:
	-cd $(API_DIR) && \
	 docker build .. --build-arg APPLE_SILICON_LOCAL=${APPLE_SILICON_LOCAL} --file docker-conf/Dockerfile-celery-beat --tag $(REGISTRY_HOST)/estela-celery-beat:latest  --platform $(PLATFORM) && \
	 docker build .. --build-arg APPLE_SILICON_LOCAL=${APPLE_SILICON_LOCAL} --file docker-conf/Dockerfile-celery-worker --tag $(REGISTRY_HOST)/estela-celery-worker:latest  --platform $(PLATFORM)
	-docker push $(REGISTRY_HOST)/estela-celery-beat:latest
	-docker push $(REGISTRY_HOST)/estela-celery-worker:latest


.PHONY: update-redis-image
update-redis-image:
	-cd $(API_DIR) && \
	 docker build .  --build-arg APPLE_SILICON_LOCAL=${APPLE_SILICON_LOCAL} --file docker-conf/Dockerfile-redis --tag $(REGISTRY_HOST)/estela-redis:latest  --platform $(PLATFORM)
	-docker push $(REGISTRY_HOST)/estela-redis:latest


.PHONY: update-build-project-image
update-build-project-image:
	-cd $(API_DIR) && \
	 docker build ..  --build-arg APPLE_SILICON_LOCAL=${APPLE_SILICON_LOCAL} --file docker-conf/Dockerfile-build-project --tag $(REGISTRY_HOST)/estela-build-project:latest  --platform $(PLATFORM)
	-docker push $(REGISTRY_HOST)/estela-build-project:latest


.PHONY: update-consumer-image
update-consumer-image:
	-cd $(QUEUING_DIR) && \
	 docker build ..  --build-arg APPLE_SILICON_LOCAL=${APPLE_SILICON_LOCAL} --file Dockerfile --tag $(REGISTRY_HOST)/estela-consumer:latest  --platform $(PLATFORM)
	-docker push $(REGISTRY_HOST)/estela-consumer:latest


.PHONY: update-all-images
update-all-images: update-api-image update-celery-image update-redis-image update-build-project-image update-consumer-image


.PHONY: refresh-api
refresh-api: update-api-image
	-kubectl rollout restart deployment estela-django-api


.PHONY: refresh-celery
refresh-celery: update-celery-image
	-kubectl rollout restart deployment estela-celery-beat
	-kubectl rollout restart deployment estela-celery-worker


.PHONY: refresh-redis
refresh-redis: update-redis-image
	-kubectl rollout restart deployment estela-redis


.PHONY: refresh-consumers
refresh-consumers: update-consumer-image
	-kubectl rollout restart deployment queue-items-consumer
	-kubectl rollout restart deployment queue-logs-consumer
	-kubectl rollout restart deployment queue-requests-consumer
	-kubectl rollout restart deployment queue-stats-consumer


.PHONY: refresh-all
refresh-all: refresh-api refresh-celery refresh-redis refresh-consumers


.PHONY: test
test:
	-kubectl exec $(API_POD) -- pytest -svx


.PHONY: makemigrations
makemigrations:
	-kubectl exec $(API_POD) -- python manage.py makemigrations


.PHONY: migrate
migrate:
	-kubectl exec $(API_POD) -- python manage.py migrate


.PHONY: createsuperuser
createsuperuser:
	-kubectl exec --stdin --tty $(API_POD) -- python manage.py createsuperuser


.PHONY: docs
docs:
	-cd $(API_DIR) && rm -f $(API_DOC)
	-cd $(ROOT_DIR) && \
	 export CREDENTIALS=local && export ENGINE=kubernetes && export SPIDERDATA_DB_ENGINE=mongodb && \
	 python3 estela-api/manage.py generate_swagger -f yaml estela-api/$(API_DOC)
	-cp $(API_DIR)/$(API_DOC) $(WEB_DIR)/api.yaml
	-cd $(WEB_DIR) && yarn generate-api


.PHONY: lint
lint:
	-cd $(ROOT_DIR) && black .


.PHONY: upgrade-release
upgrade-release:
	-cd $(INSTALLATION_DIR) && . ./local/.env && cd helm-chart && \
	 helm upgrade $${RELEASE_NAME} -f values.yaml . && helm history $${RELEASE_NAME} && helm get values $${RELEASE_NAME}


.PHONY: rollback-release
rollback-release:
	-cd $(INSTALLATION_DIR) && . ./local/.env && cd helm-chart && \
	 helm rollback $${RELEASE_NAME} $(release) && helm history $${RELEASE_NAME} && helm get values $${RELEASE_NAME}


.PHONY: history-release
history-release:
	-cd $(INSTALLATION_DIR) && . ./local/.env && cd helm-chart && \
	 helm history $${RELEASE_NAME}
