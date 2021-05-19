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
$ eksctl create cluster -f kubernetes/cluster.yaml  # Create cluster
$ kubectl create -f kubernetes/zookeeper-deployment.yaml
$ kubectl create -f kubernetes/zookeeper-service.yaml
$ kubectl create -f kubernetes/kafka-service.yaml
$ kubectl get services  # get kafka-service external IP
$ kubectl create -f kubernetes/kafka-deployment.yaml  # put kafka-service external IP as KAFKA_ADVERTISED_HOST_NAME

check services and pods
$ kubectl get pods
$ kubectl get services
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

## Create producer deployment

```sh
$ kubectl apply -f kubernetes/producer.yaml
```

## Create consumer deployment

```sh
$ kubectl apply -f kubernetes/consumer.yaml
```
