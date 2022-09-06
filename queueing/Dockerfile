FROM python:3.6

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /home/estela

COPY queueing/requirements requirements
RUN pip install -r requirements/consumer.txt

COPY queueing/consumer.py .
COPY queueing/inserter.py .
COPY queueing/utils.py .
COPY queueing/config config
COPY database_adapters/ ./database_adapters
