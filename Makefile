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
	-docker build . --file docker-conf/Dockerfile-***REMOVED***-api --tag bitmaker-***REMOVED***-api
	-docker build . --file docker-conf/Dockerfile-celery-worker --tag bitmaker-celery-worker
	-docker build . --file docker-conf/Dockerfile-celery-beat --tag bitmaker-celery-beat
	-docker build . --file docker-conf/Dockerfile-redis --tag bitmaker-redis


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


.PHONY: deploy
deploy: build-all-images upload-all-images
	-kubectl apply -f config/kubernetes/bitmaker-secrets.yaml
	-kubectl apply -f config/kubernetes/bitmaker-configmaps.yaml
	-kubectl apply -f config/kubernetes/aws-registry-cronjob.yaml
	-kubectl apply -f config/kubernetes/bitmaker-api-deployments.yaml
	-kubectl apply -f config/kubernetes/bitmaker-kafka.yaml


.PHONY: apply
apply: build-all-images upload-all-images
	-kubectl rollout restart deployment bitmaker-***REMOVED***-api
	-kubectl rollout restart deployment bitmaker-celery-beat
	-kubectl rollout restart deployment bitmaker-celery-worker
	-kubectl rollout restart deployment bitmaker-redis


.PHONY: destroy
destroy:
	-kubectl delete -f config/kubernetes/bitmaker-secrets.yaml
	-kubectl delete -f config/kubernetes/bitmaker-configmaps.yaml
	-kubectl delete -f config/kubernetes/aws-registry-cronjob.yaml
	-kubectl delete -f config/kubernetes/bitmaker-api-services.yaml
	-kubectl delete -f config/kubernetes/bitmaker-api-deployments.yaml
	-kubectl delete -f config/kubernetes/bitmaker-kafka.yaml
	-kubectl delete jobs $$(kubectl get jobs -o custom-columns=:.metadata.name)
	-kubectl delete cronjobs $$(kubectl get cronjobs -o custom-columns=:.metadata.name)
