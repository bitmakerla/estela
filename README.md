<h1 align="center">Estela</h1>

[![Code style: black](https://img.shields.io/badge/code%20style-black-000000.svg)](https://github.com/psf/black)

<h4 align="center">
Estela is an elastic web scraping cluster created by <a href="https://bitmaker.la/">Bitmaker</a>. It allows users
interested in web scraping to run their spiders (e.g., Scrapy spiders) in an infrastructure that lets them monitor and
manage their projects more effortlessly, similar to <a href="https://www.zyte.com/scrapy-cloud/">Scrapy Cloud</a>. It
contains some unique features and functionalities to the point that you can deploy it in-home.
</h4>

<h3>Technologies</h3>
<p align="left">
  <a href="https://www.docker.com/" target="_blank" rel="noreferrer"> <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/docker/docker-original-wordmark.svg" alt="docker" width="40" height="40"/> </a>
  <a href="https://www.python.org" target="_blank" rel="noreferrer"> <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/python/python-original.svg" alt="python" width="40" height="40"/> </a>
  <a href="https://reactjs.org/" target="_blank" rel="noreferrer"> <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/react/react-original-wordmark.svg" alt="react" width="40" height="40"/> </a>
  <a href="https://nodejs.org/" target="_blank" rel="noreferrer"> <img src="https://www.vectorlogo.zone/logos/nodejs/nodejs-icon.svg" alt="nodejs" width="40" height="40"/> </a>
</p>

<h3>Project Structure</h3>

The project consists of three main modules:
- API: Implements a REST API built with the Django REST framework toolkit, which exposes several endpoints to manage
    projects, spiders, and jobs. It uses Celery for task processing and takes care of deploying your Scrapy projects,
    among other things.
- Queueing: A high-throughput, low-latency platform that controls real-time data feeds in a producer-consumer
    architecture. In this module, you will find a Kafka consumer  used to collect and transport the information from
    the spiders into a database.
- Web: A front-end project implemented with React Framework (with Ant Design) and Typescript. This module implements a
    user-friendly environment that communicates with the API and lets you manage your spiders and scraping projects.

Each of these modules works independently of the rest and can be changed. Enter each folder to obtain a more detailed
description of the module.
