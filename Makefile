WEB = bitmaker_web
REPOSITORY = 094814489188.dkr.ecr.***REMOVED***.amazonaws.com

.PHONY: setup
setup: build up restart migrate createsuperuser


.PHONY: rebuild
rebuild: down build up


.PHONY: start
start:
	-docker compose start


.PHONY: restart
restart:
	-docker compose restart


.PHONY: stop
stop:
	-docker compose stop


.PHONY: down
down:
	-docker compose down


.PHONY: up
up:
	-docker compose up -d


.PHONY: build
build:
	-docker compose build


.PHONY: test
test:
	-docker exec -it $(WEB) pytest -svx


.PHONY: makemigrations
makemigrations:
	-docker exec -it $(WEB) python manage.py makemigrations


.PHONY: migrate
migrate:
	-docker exec -it $(WEB) python manage.py migrate


.PHONY: createsuperuser
createsuperuser:
	-docker exec -it $(WEB) python manage.py createsuperuser


.PHONY: build-images
build-images:
	-docker build . --file docker-conf/Dockerfile-***REMOVED***-api --tag bitmaker-***REMOVED***-api
	-docker build . --file docker-conf/Dockerfile-celery-worker --tag bitmaker-celery-worker
	-docker build . --file docker-conf/Dockerfile-celery-beat --tag bitmaker-celery-beat
	-docker build . --file docker-conf/Dockerfile-redis --tag bitmaker-redis


.PHONY: upload-images
upload-images:
	-docker tag bitmaker-***REMOVED***-api:latest $(REPOSITORY)/bitmaker-***REMOVED***-api:latest
	-docker tag bitmaker-celery-beat:latest $(REPOSITORY)/bitmaker-celery-beat:latest
	-docker tag bitmaker-celery-worker:latest $(REPOSITORY)/bitmaker-celery-worker:latest
	-docker tag bitmaker-redis:latest $(REPOSITORY)/bitmaker-redis:latest
	-docker push $(REPOSITORY)/bitmaker-***REMOVED***-api:latest
	-docker push $(REPOSITORY)/bitmaker-celery-beat:latest
	-docker push $(REPOSITORY)/bitmaker-celery-worker:latest
	-docker push $(REPOSITORY)/bitmaker-redis:latest


.PHONY: lint
lint:
	-black .
