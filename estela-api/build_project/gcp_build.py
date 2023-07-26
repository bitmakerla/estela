import json
import logging
import os
import sys
from zipfile import ZipFile

import google.auth
import google.cloud.logging
import requests
from django.conf import settings
from google.cloud import run_v2, storage
from google.cloud.devtools import cloudbuild_v1
from google.cloud.logging import DESCENDING, StructEntry
from google.cloud.run_v2 import EnvVar

sys.path.append("/home/estela/estela-api")
os.environ["DJANGO_SETTINGS_MODULE"] = "config.settings.base"

from config.job_manager import credentials as GCP

bucket_name = os.getenv("BUCKET_NAME")
PID, DID = os.getenv("KEY").split(".")
project_zip_name = "{}.zip".format(PID)
re_token = os.getenv("REGISTRY_TOKEN")
ESTELA_IMAGE = os.getenv("CONTAINER_IMAGE")
TOKEN = os.getenv("TOKEN")
HOST = json.loads(os.getenv("JOB_INFO"))["api_host"]

ESTELA_DIR = ".estela"

DOCKERFILE_NAME = "Dockerfile-estela"

build_client = cloudbuild_v1.services.cloud_build.CloudBuildClient(credentials=GCP.auth_credential)
run_client = run_v2.JobsClient(credentials=GCP.auth_credential)

def download_zip():
    GCP.download_project(bucket_name, project_zip_name)

def unzip_project():
    with ZipFile(project_zip_name, "r") as zipObj:
        zipObj.extractall()
    os.remove(project_zip_name)

def build_image(estela_project_path, dockerfile, project_zip, image):
    build = cloudbuild_v1.Build()
    build.source.storage_source = cloudbuild_v1.StorageSource(bucket="estela-api-projects",object=project_zip)
    build.steps.append(cloudbuild_v1.BuildStep(
        name="gcr.io/cloud-builders/docker",
        args=["build", "--network", "cloudbuild", "--no-cache", "-f", dockerfile, "-t", image, estela_project_path]
    ))
    build.images = [image]
    operation = build_client.create_build(project_id=credentials.quota_project_id, build=build)

    result = operation.result()

def get_spiders_from_logs(execution_id): #Recuperar credenciales
    # Instantiates a client
    client = google.cloud.logging.Client(credentials=GCP.auth_credential,project=GCP.credentials["GOOGLE_APPLICATION_PROJECT_ID"])
    filter_str = (
        f'labels."run.googleapis.com/execution_name"="{execution_id}"'
    )
    for entry in client.list_entries(filter_=filter_str,order_by=DESCENDING):  # API call(s)
        if isinstance(entry,StructEntry):
            return entry.to_api_repr()["jsonPayload"]["spiders"]
        
def init_image(project_id,location,job_id,image):
    container = run_v2.Container(
        name="scrapy-project",
        image=image,
        command=["estela-describe-project"],
        env=[EnvVar(name="QUEUE_PLATFORM_PORT",value="9092"),EnvVar(name="QUEUE_PLATFORM_LISTENERS",value="kafka"),EnvVar(name="QUEUE_PLATFORM",value="kafka")]
    )
    task_template = run_v2.TaskTemplate(containers=[container])
    template = run_v2.ExecutionTemplate(template=task_template)
    job = run_v2.Job(
        template=template
    )
    request = run_v2.CreateJobRequest(
        parent=f"projects/{project_id}/locations/{location}",
        job_id=job_id,
        job=job
    )
    operation = run_client.create_job(request=request)
    result = operation.result()

def execute_image(project_id,location,job_id): # Ejecutar el Job Creado
    request = run_v2.RunJobRequest(
        name=f"projects/{project_id}/locations/{location}/jobs/{job_id}",
    )

    operation = run_client.run_job(request=request)
    response = operation.result()
    return get_spiders_from_logs(response.name.split("/")[-1])

def terminate_image(project_id,location,job_id):
    # Create a client
    request = run_v2.DeleteJobRequest(
        name=f"projects/{project_id}/locations/{location}/jobs/{job_id}",
    )

    # Make the request
    operation = run_client.delete_job(request=request)

    response = operation.result()

def get_spiders(project_id,location,job_id,image):
    init_image(project_id,location,job_id,image)
    spiders = execute_image(project_id,location,job_id)
    terminate_image(project_id,location,job_id)
    return spiders

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
        PROJECT_PATH = os.path.join("/workspace", PROJECT_PATH)
        DOCKERFILE_PATH = os.path.join(PROJECT_PATH, ESTELA_DIR, DOCKERFILE_NAME)

        logging.info("Image building...")
        build_image(estela_project_path=PROJECT_PATH, dockerfile=DOCKERFILE_PATH, project_zip=project_zip_name, image=ESTELA_IMAGE)
        logging.info("Image built successfully.")

        logging.info("Getting spiders...")
        spiders = get_spiders(project_id=GCP.credentials["GOOGLE_APPLICATION_PROJECT_ID"], location=GCP.credentials["GOOGLE_APPLICATION_LOCATION"], job_id=PID, image=ESTELA_IMAGE)
        logging.info("Spiders {} successfully obtained.".format(" ".join(spiders)))

        update_deploy_status("SUCCESS", spiders)
    except Exception as ex:
        update_deploy_status("FAILURE")
        logging.info(ex)

if __name__ == "__main__":
    sys.exit(main())
