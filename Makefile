REPOSITORY = 094814489188.dkr.ecr.***REMOVED***.amazonaws.com
REGION = ***REMOVED***
APIPOD = $$(kubectl get pod -l app=bitmaker-***REMOVED***-api -o jsonpath="{.items[0].metadata.name}")


.PHONY: start
start:
	-minikube start --feature-gates="TTLAfterFinished=true"


.PHONY: stop
stop:
	-minikube stop


.PHONY: setup
setup: start build-api-image upload-api-image
	-kubectl create secret docker-registry regcred \
	  --docker-server=$(REPOSITORY) \
	  --docker-username=AWS \
	  --docker-password=$$(aws ecr get-login-password --region $(REGION))
	-kubectl apply -f config/kubernetes-local/services.yaml
	-kubectl apply -f config/kubernetes-local/api.yaml
	-kubectl apply -f config/kubernetes-local/kafka.yaml


.PHONY: rebuild
rebuild: build-api-image upload-api-image
	-kubectl rollout restart deployment bitmaker-***REMOVED***-api


.PHONY: down
down:
	-kubectl delete secret regcred
	-kubectl delete -f config/kubernetes-local/services.yaml
	-kubectl delete -f config/kubernetes-local/api.yaml
	-kubectl delete -f config/kubernetes-local/kafka.yaml
	-kubectl delete jobs $(kubectl get jobs -o custom-columns=:.metadata.name)
	-kubectl delete cronjobs $(kubectl get cronjobs -o custom-columns=:.metadata.name)


.PHONY: test
test:
	-kubectl exec $(APIPOD) -- pytest -svx


.PHONY: makemigrations
makemigrations:
	-kubectl exec $(APIPOD) -- python manage.py makemigrations


.PHONY: migrate
migrate:
	-kubectl exec $(APIPOD) -- python manage.py migrate


.PHONY: createsuperuser
createsuperuser:
	-kubectl exec --stdin $(APIPOD) -- python manage.py createsuperuser


.PHONY: build-all-images
build-all-images:
	-docker build . --file docker-conf/Dockerfile-***REMOVED***-api --tag bitmaker-***REMOVED***-api
	-docker build . --file docker-conf/Dockerfile-celery-worker --tag bitmaker-celery-worker
	-docker build . --file docker-conf/Dockerfile-celery-beat --tag bitmaker-celery-beat
	-docker build . --file docker-conf/Dockerfile-redis --tag bitmaker-redis


.PHONY: login-ecr
login-ecr:
	-aws ecr get-login-password --region $(REGION) | docker login \
	   --username AWS --password-stdin  $(REPOSITORY)


.PHONY: upload-all-images
upload-all-images: login-ecr
	-docker tag bitmaker-***REMOVED***-api:latest $(REPOSITORY)/bitmaker-***REMOVED***-api:latest
	-docker tag bitmaker-celery-beat:latest $(REPOSITORY)/bitmaker-celery-beat:latest
	-docker tag bitmaker-celery-worker:latest $(REPOSITORY)/bitmaker-celery-worker:latest
	-docker tag bitmaker-redis:latest $(REPOSITORY)/bitmaker-redis:latest
	-docker push $(REPOSITORY)/bitmaker-***REMOVED***-api:latest
	-docker push $(REPOSITORY)/bitmaker-celery-beat:latest
	-docker push $(REPOSITORY)/bitmaker-celery-worker:latest
	-docker push $(REPOSITORY)/bitmaker-redis:latest


.PHONY: build-api-image
build-api-image:
	-docker build . --file docker-conf/Dockerfile-***REMOVED***-api --tag bitmaker-***REMOVED***-api


.PHONY: upload-api-image
upload-api-image: login-ecr
	-docker tag bitmaker-***REMOVED***-api:latest $(REPOSITORY)/bitmaker-***REMOVED***-api:latest
	-docker push $(REPOSITORY)/bitmaker-***REMOVED***-api:latest


.PHONY: lint
lint:
	-black .
