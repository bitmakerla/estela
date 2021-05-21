WEB = bitmaker_web

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
