FROM python:3.9

ARG APPLE_SILICON_LOCAL=false
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /home/estela

COPY queueing/requirements requirements
RUN if [ "$APPLE_SILICON_LOCAL" = "true" ]; then \
        apt-get update && apt-get install -y unixodbc-dev && \
        pip install --no-binary :all: pyodbc && \
        sed -i '/pyodbc/d' requirements/consumer.txt; \
    fi
RUN pip install -r requirements/consumer.txt

COPY queueing/consumer.py .
COPY queueing/inserter.py .
COPY queueing/utils.py .
COPY queueing/config config
COPY database_adapters/ ./database_adapters
