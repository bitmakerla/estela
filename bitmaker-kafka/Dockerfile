FROM python:3.6

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /home/bitmaker

COPY bitmaker-kafka/requirements requirements
RUN pip install -r requirements/consumer.txt

COPY bitmaker-kafka/consumer.py .
COPY database_adapters/ ./database_adapters/
COPY bitmaker-kafka/config config
