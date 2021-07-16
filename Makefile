REPOSITORY = 094814489188.dkr.ecr.***REMOVED***.amazonaws.com
REGION = ***REMOVED***
APIPOD = $$(kubectl get pod -l app=bitmaker-***REMOVED***-api -o jsonpath="{.items[0].metadata.name}")


.PHONY: start
start:
	-minikube start --feature-gates="TTLAfterFinished=true"
	-docker compose up -d


.PHONY: stop
stop:
	-minikube stop
	-docker compose stop


.PHONY: setup
setup: build-api-image upload-api-image
	-kubectl apply -f config/kubernetes-local/bitmaker-secrets.yaml
	-kubectl apply -f config/kubernetes-local/bitmaker-configmaps.yaml
	-kubectl apply -f config/kubernetes-local/aws-registry-cronjob.yaml
	-kubectl apply -f config/kubernetes-local/bitmaker-api-deployments.yaml
	-kubectl apply -f config/kubernetes-local/bitmaker-kafka.yaml


.PHONY: rebuild
rebuild: build-api-image upload-api-image
	-kubectl rollout restart deployment bitmaker-***REMOVED***-api


.PHONY: down
down:
	-kubectl delete -f config/kubernetes-local/bitmaker-secrets.yaml
	-kubectl delete -f config/kubernetes-local/bitmaker-configmaps.yaml
	-kubectl delete -f config/kubernetes-local/aws-registry-cronjob.yaml
	-kubectl delete -f config/kubernetes-local/bitmaker-api-services.yaml
	-kubectl delete -f config/kubernetes-local/bitmaker-api-deployments.yaml
	-kubectl delete -f config/kubernetes-local/bitmaker-kafka.yaml
	-kubectl delete jobs $$(kubectl get jobs -o custom-columns=:.metadata.name)
	-kubectl delete cronjobs $$(kubectl get cronjobs -o custom-columns=:.metadata.name)
	-minikube delete
	-docker compose down


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
	-kubectl exec --stdin --tty $(APIPOD) -- python manage.py createsuperuser


.PHONY: login-ecr
login-ecr:
	-aws ecr get-login-password --region $(REGION) | docker login \
	   --username AWS --password-stdin  $(REPOSITORY)


.PHONY: build-all-images
build-all-images:
	-docker build . --file docker-conf/Dockerfile-***REMOVED***-api --tag bitmaker-***REMOVED***-api:dev
	-docker build . --file docker-conf/Dockerfile-celery-worker --tag bitmaker-celery-worker:dev
	-docker build . --file docker-conf/Dockerfile-celery-beat --tag bitmaker-celery-beat:dev
	-docker build . --file docker-conf/Dockerfile-redis --tag bitmaker-redis:dev


.PHONY: upload-all-images
upload-all-images: login-ecr
	-docker tag bitmaker-***REMOVED***-api:dev $(REPOSITORY)/bitmaker-***REMOVED***-api:dev
	-docker tag bitmaker-celery-beat:dev $(REPOSITORY)/bitmaker-celery-beat:dev
	-docker tag bitmaker-celery-worker:dev $(REPOSITORY)/bitmaker-celery-worker:dev
	-docker tag bitmaker-redis:dev $(REPOSITORY)/bitmaker-redis:dev
	-docker push $(REPOSITORY)/bitmaker-***REMOVED***-api:dev
	-docker push $(REPOSITORY)/bitmaker-celery-beat:dev
	-docker push $(REPOSITORY)/bitmaker-celery-worker:dev
	-docker push $(REPOSITORY)/bitmaker-redis:dev


.PHONY: build-api-image
build-api-image:
	-docker build . --file docker-conf/Dockerfile-***REMOVED***-api --tag bitmaker-***REMOVED***-api:dev


.PHONY: upload-api-image
upload-api-image: login-ecr
	-docker tag bitmaker-***REMOVED***-api:dev $(REPOSITORY)/bitmaker-***REMOVED***-api:dev
	-docker push $(REPOSITORY)/bitmaker-***REMOVED***-api:dev


.PHONY: lint
lint:
	-black .
