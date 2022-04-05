FROM python:3.6

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /home/bitmaker

COPY requirements requirements
RUN pip install -r requirements/consumer.txt

COPY consumer.py .
# COPY config config
