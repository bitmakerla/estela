<h1 align="center"> Bitmaker Cloud</h1>

[![Code style: black](https://img.shields.io/badge/code%20style-black-000000.svg)](https://github.com/psf/black)

<h4 align="center">Bitmaker Cloud is a product created by Bitmaker so that clients or users interested in web scraping can run their spiders (for example scrapy spiders) on our servers, something similar to a zyte (www.zyte.com), but with more features and functionalities to the point that it can be deployed in-home.</h4>

<h3>Technologies</h3>
<p align="left"> <a href="https://www.docker.com/" target="_blank" rel="noreferrer"> <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/docker/docker-original-wordmark.svg" alt="docker" width="40" height="40"/> </a>  <a href="https://kubernetes.io" target="_blank" rel="noreferrer"> <img src="https://www.vectorlogo.zone/logos/kubernetes/kubernetes-icon.svg" alt="kubernetes" width="40" height="40"/> </a> <a href="https://www.python.org" target="_blank" rel="noreferrer"> <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/python/python-original.svg" alt="python" width="40" height="40"/> </a> <a href="https://reactjs.org/" target="_blank" rel="noreferrer"> <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/react/react-original-wordmark.svg" alt="react" width="40" height="40"/> </a> <a href="https://nodejs.org/" target="_blank" rel="noreferrer"> <img src="https://www.vectorlogo.zone/logos/nodejs/nodejs-icon.svg" alt="nodejs" width="40" height="40"/> </a> <a href="https://nodejs.org/" target="_blank" rel="noreferrer"> <img src="https://www.vectorlogo.zone/logos/apache_kafka/apache_kafka-vertical.svg" alt="kafka" width="40" height="40"/> </a> </p>

<h3> Structure </h3>

The project has 3 main modules:
- Bitmaker API: Contains everything related to the API of the product, from where the spiders are managed.
- Bitmaker Kafka: Contains everything related to the Kafka cluster used to collect and transport the information of the spiders.
- Bitmaker Web: Contains everything related to the Front-End of the product, from where you can manage the spiders with a user-friendly environment.

Each of these modules works independently of the rest, and can be changed, e.g. Use RabbitMQ instead of Kafka. 

* *Enter each folder to obtain a more complete description of the module*