<h1 align="center">estela</h1>

[![Code style: black](https://img.shields.io/badge/code%20style-black-000000.svg)](https://github.com/psf/black)
[![version](https://img.shields.io/badge/version-0.1-blue)](https://github.com/bitmakerla/estela)
[![yarn-version](https://img.shields.io/badge/yarn-v1.22.19-blue)](https://yarnpkg.com)
[![django-version](https://img.shields.io/badge/Django-v3.1.1-orange)](https://www.djangoproject.com)
[![build](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/bitmakerla/estela/actions)
![CI](https://github.com/eslint/eslint/workflows/CI/badge.svg)
[![license](https://img.shields.io/badge/license-MIT-lightgrey)](https://github.com/bitmakerla/estela/blob/main/LICENSE.md)


<h4 align="center">
<strong>estela</strong> is an elastic web scraping cluster running on Kubernetes. It provides mechanisms to deploy, run and scale
web scraping spiders via a REST API and a web interface.
</h4>

<h3>Technologies</h3>
<p align="center">
  <a href="https://www.docker.com/" target="_blank" rel="noreferrer"> <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/docker/docker-original-wordmark.svg" alt="docker" width="40" height="40"/> </a>
  <a href="https://www.python.org" target="_blank" rel="noreferrer"> <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/python/python-original.svg" alt="python" width="40" height="40"/> </a>
  <a href="https://reactjs.org/" target="_blank" rel="noreferrer"> <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/react/react-original-wordmark.svg" alt="react" width="40" height="40"/> </a>
  <a href="https://nodejs.org/" target="_blank" rel="noreferrer"> <img src="https://www.vectorlogo.zone/logos/nodejs/nodejs-icon.svg" alt="nodejs" width="40" height="40"/> </a>
</p>

<h3>Project Structure</h3>

The project consists of three main modules:
- [**REST API**](https://github.com/bitmakerla/estela/tree/main/estela-api) : built with the Django REST framework toolkit, it exposes several endpoints to manage projects, spiders, and
    jobs. It uses Celery for task processing and takes care of deploying your Scrapy projects, among other things.
- [**Queueing**](https://github.com/bitmakerla/estela/tree/main/queueing) : estela needs a high-throughput, low-latency platform that controls real-time data feeds in a
    producer-consumer architecture. In this module, you will find a Kafka consumer used to collect and transport the
    information from the spider jobs into a database.
- [**Web**](https://github.com/bitmakerla/estela/tree/main/estela-web) : A web interface implemented with React and Typescript that lets you manage projects and spiders.

Each of these modules works independently of the rest and can be changed. Each module has a more detailed description
in its corresponding directory.
