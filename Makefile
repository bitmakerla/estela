WEB = bitmaker_web_1

.PHONY: up
up:
	-docker-compose up


.PHONY: down
down:
	-docker-compose down


.PHONY: build
build:
	-docker-compose build


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
