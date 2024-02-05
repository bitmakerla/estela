FROM python:3.9

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /home/estela

COPY queueing/requirements requirements
RUN apt-get update && apt-get install -y unixodbc-dev
RUN pip install -r requirements/consumer.txt

COPY queueing/consumer.py .
COPY queueing/inserter.py .
COPY queueing/utils.py .
COPY queueing/config config
COPY database_adapters/ ./database_adapters
