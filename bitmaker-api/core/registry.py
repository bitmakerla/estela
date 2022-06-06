import boto3
from botocore.exceptions import ClientError
from elasticsearch import Elasticsearch, RequestsHttpConnection
from django.conf import settings


def get_logs(spiderjob, offset, page_size):
    es = Elasticsearch(
        hosts=[
            {"host": settings.ELASTICSEARCH_HOST, "port": settings.ELASTICSEARCH_PORT}
        ],
        timeout=60,
        http_auth=(settings.ELASTICSEARCH_USER, settings.ELASTICSEARCH_PASS),
        use_ssl=True,
        verify_certs=True,
        connection_class=RequestsHttpConnection,
    )
    query = {
        "_source": False,
        "query": {"match": {"kubernetes.labels.job-name": spiderjob}},
        "fields": ["message"],
        "sort": [{"@timestamp": "asc"}],
        "size": page_size,
        "from": offset,
    }
    result = es.search(index=settings.LOGS_INDEX, body=query)

    hits = result["hits"]["hits"]
    count = result["hits"]["total"]["value"]
    logs = []
    for hit in hits:
        messages = hit["fields"]["message"]
        for message in messages:
            logs.append(message)
    return count, logs
