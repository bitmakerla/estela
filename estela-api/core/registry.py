import boto3
from botocore.exceptions import ClientError
from elasticsearch import Elasticsearch, RequestsHttpConnection
from django.conf import settings
