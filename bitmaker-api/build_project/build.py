import os
import sys
import json
from time import sleep
import docker
import base64
import requests
import logging

from zipfile import ZipFile


import sys, os
sys.path.append('/c/bitmaker-api')
os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings.test'

from config.job_manager import credentials

bucket_name = os.getenv("BUCKET_NAME")
PID, DID = os.getenv("KEY").split(".")
project_zip_name = "{}.zip".format(PID)
re_token = os.getenv("REGISTRY_TOKEN")
BM_IMAGE = os.getenv("CONTAINER_IMAGE")
TOKEN = os.getenv("TOKEN")
HOST = json.loads(os.getenv("JOB_INFO"))["api_host"]

BITMAKER_DIR = ".bitmaker"

DOCKERFILE_NAME = "Dockerfile-bitmaker"


def download_zip():
    credentials.download_project(bucket_name, project_zip_name)


def unzip_project():
    with ZipFile(project_zip_name, "r") as zipObj:
        zipObj.extractall()
    os.remove(project_zip_name)


def build_image(PROJECT_PATH, DOCKERFILE_PATH):
    project_path = PROJECT_PATH
    docker_client = docker.from_env()
    docker_client.images.build(
        nocache=True,
        path=project_path,
        dockerfile=DOCKERFILE_PATH,
        tag=BM_IMAGE,
    )
    docker_client.containers.prune()


def upload_image():
    repository, image_name = BM_IMAGE.rsplit(":", 1)
    auth_config = None
    if re_token:
        username, password = base64.b64decode(re_token).decode().split(":")
        auth_config = {"username": username, "password": password}

    docker_client = docker.from_env()

    docker_client.images.push(
        repository=repository, tag=image_name, auth_config=auth_config
    )


def get_default_headers():
    headers = {}
    if TOKEN:
        headers["Authorization"] = "Token {}".format(TOKEN)
    return headers


def url_for(endpoint):
    api_base = "{}/api".format(HOST)
    return "{}/{}".format(api_base, endpoint)


def put(endpoint, data=None, params=None):
    if params is None:
        params = {}
    if data is None:
        data = {}
    headers = get_default_headers()
    return requests.put(url_for(endpoint), data=data, headers=headers, params=params)


def get_spiders():
    docker_client = docker.from_env()
    output = docker_client.containers.run(
        BM_IMAGE, "bm-describe-project", auto_remove=True
    )
    spiders = json.loads(output)["spiders"]
    return spiders


def check_status(response, status_code, error_field="detail"):
    if response.status_code != status_code:
        response_json = response.json()
        if error_field in response_json:
            raise Exception(response_json[error_field])
        else:
            raise Exception(str(response_json))


def update_deploy_status(STATUS, spiders=[]):
    endpoint = "projects/{}/deploys/{}".format(PID, DID)
    data = {"status": STATUS, "spiders_names": spiders}
    response = put(endpoint, data=data)
    check_status(response, 200)


def main():
    logging.basicConfig(level=logging.INFO)
    try:
        download_zip()
        unzip_project()
        logging.info("Project downloaded successfully.")
        PROJECT_PATH = next(os.scandir(".")).name
        PROJECT_PATH = os.path.join(os.path.abspath("."), PROJECT_PATH)
        DOCKERFILE_PATH = os.path.join(PROJECT_PATH, BITMAKER_DIR, DOCKERFILE_NAME)

        logging.info("Image building...")
        build_image(PROJECT_PATH, DOCKERFILE_PATH)
        logging.info("Image built successfully.")

        logging.info("Getting spiders...")
        spiders = get_spiders()
        logging.info("Spiders {} successfully obtained.".format(" ".join(spiders)))

        logging.info("Image uploading...")
        upload_image()
        logging.info("Image uploaded successfully.")

        update_deploy_status("SUCCESS", spiders)
    except Exception as ex:
        update_deploy_status("FAILURE")
        logging.info(ex)


if __name__ == "__main__":
    print("Tan gozu?")
    sys.exit(main())
