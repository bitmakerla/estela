# Bitmaker Scraping Streaming Platform

## Set-up

To run locally you need to run Kafka locally with this [tutorial](https://kafka.apache.org/quickstart)

Set up your virtual environment and install consumer and producer requirements:

```sh
$ pip install -r requirements/consumer.txt
```

```sh
$ pip install -r requirements/producer.txt
```

Finally, add environment variables KAFKA_ADVERTISED_HOST_NAME and KAFKA_ADVERTISED_PORT

## Set-up Kubernetes Cluster

```sh
$ eksctl create cluster -f kubernetes/cluster.yaml  # create cluster
$ kubectl apply -f kubernetes/autoscaler.yaml
$ kubectl apply -f kubernetes/zookeeper.yaml
$ kubectl apply -f kubernetes/kafka.yaml

# check nodes, services and pods
$ kubectl get nodes --show-labels
$ kubectl get pod -o=custom-columns=NAME:.metadata.name,STATUS:.status.phase,NODE:.spec.nodeName --all-namespaces
$ kubectl get pods
$ kubectl get services
```

If you want to delete the cluster:

```sh
$ eksctl delete cluster test --wait --region us-east-2  # delete cluster in region us-east-2
```

## Create Consumer and Producer Docker Images

```sh
$ docker build . --file Dockerfile-producer --tag kafka-producer
$ docker build . --file Dockerfile-consumer --tag kafka-consumer

$ docker tag kafka-producer:latest REPOSITORY/kafka-producer:latest
$ docker tag kafka-consumer:latest REPOSITORY/kafka-consumer:latest

$ docker push REPOSITORY/kafka-producer:latest
$ docker push REPOSITORY/kafka-consumer:latest
```

## Create consumer deployment

```sh
$ kubectl apply -f kubernetes/consumer.yaml
```

## Create producer job

```sh
$ kubectl apply -f kubernetes/producer.yaml
```

## Horizontal Deployment Autoscaling

If we want to autoscale a deployment we have to run the next command:

```sh
$ kubectl autoscale deployment DEPLOYMENT_NAME --cpu-percent=50 --min=1 --max=2
```
