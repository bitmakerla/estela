import base64
import json
import logging
import os
import sys
from zipfile import ZipFile

import docker
import requests
from django.conf import settings

sys.path.append("/home/estela/estela-api")
os.environ["DJANGO_SETTINGS_MODULE"] = "config.settings.base"

from config.job_manager import credentials

bucket_name = os.getenv("BUCKET_NAME")
PID, DID = os.getenv("KEY").split(".")
project_zip_name = "{}.zip".format(PID)
re_token = os.getenv("REGISTRY_TOKEN")
ESTELA_IMAGE = os.getenv("CONTAINER_IMAGE")
TOKEN = os.getenv("TOKEN")
HOST = json.loads(os.getenv("JOB_INFO"))["api_host"]

ESTELA_DIR = ".estela"

DOCKERFILE_NAME = "Dockerfile-estela"


def download_zip():
    credentials.download_project(bucket_name, project_zip_name)


def unzip_project():
    """Extract the project ZIP and return the extracted directory name."""
    with ZipFile(project_zip_name, "r") as zipObj:
        # Get the list of all items in the ZIP
        namelist = zipObj.namelist()
        
        # Initialize project_dir
        project_dir = None
        
        # Find the root directory (common prefix of all paths)
        if namelist:
            # Get the first component of each path
            root_dirs = set()
            for name in namelist:
                # Skip if it's just a file in root (no directory)
                if '/' in name:
                    root_dirs.add(name.split('/')[0])
            
            # If there's exactly one root directory, that's our project
            if len(root_dirs) == 1:
                project_dir = root_dirs.pop()
                logging.info(f"Identified project directory from ZIP structure: {project_dir}")
            else:
                # If multiple or no directories, we'll handle it after extraction
                logging.info(f"Found {len(root_dirs)} root directories in ZIP, will determine project directory after extraction")
                project_dir = None
        else:
            logging.warning("ZIP file appears to be empty")
        
        zipObj.extractall()
    
    os.remove(project_zip_name)
    return project_dir


def build_image(PROJECT_PATH, DOCKERFILE_PATH):
    project_path = PROJECT_PATH
    docker_client = docker.from_env()
    
    logging.info(f"Starting Docker build with path: {project_path}")
    logging.info(f"Using Dockerfile: {DOCKERFILE_PATH}")
    logging.info(f"Target image tag: {ESTELA_IMAGE}")
    
    # Build with verbose output
    build_logs = docker_client.api.build(
        path=project_path,
        dockerfile=DOCKERFILE_PATH,
        tag=ESTELA_IMAGE,
        nocache=True,
        decode=True,  # Decode the streaming output
        rm=True,      # Remove intermediate containers
    )
    
    # Stream and log the build output
    for log_line in build_logs:
        if 'stream' in log_line:
            # Print each build step in real-time
            message = log_line['stream'].strip()
            if message:
                logging.info(f"BUILD: {message}")
        elif 'error' in log_line:
            logging.error(f"BUILD ERROR: {log_line['error']}")
            raise Exception(f"Docker build failed: {log_line['error']}")
        elif 'status' in log_line:
            logging.info(f"BUILD STATUS: {log_line['status']}")
    
    logging.info("Docker build completed successfully")
    docker_client.containers.prune()


def upload_image():
    repository, image_name = ESTELA_IMAGE.rsplit(":", 1)
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
    docker_client = docker.from_env(timeout=300)  # Increase Docker client timeout to 5 minutes
    try:
        logging.info("Running estela-describe-project to get spiders...")
        logging.info(f"Using image: {ESTELA_IMAGE}")
        
        # Run with explicit timeout and better error handling
        container = docker_client.containers.run(
            ESTELA_IMAGE,
            "estela-describe-project",
            auto_remove=False,  # Don't auto-remove so we can check logs if it fails
            detach=True,  # Run in detached mode to have more control
            environment=settings.QUEUE_PARAMS,
        )
        
        # Wait for container to complete with timeout
        try:
            result = container.wait(timeout=240)  # 4 minutes timeout
            exit_code = result.get('StatusCode', 1)
            
            if exit_code != 0:
                logs = container.logs().decode('utf-8')
                logging.error(f"estela-describe-project failed with exit code {exit_code}")
                logging.error(f"Container logs: {logs}")
                container.remove()
                raise Exception(f"Spider detection failed with exit code {exit_code}. Check logs above for details.")
            
            # Get the output
            output = container.logs().decode('utf-8')
            container.remove()
            
            logging.info("estela-describe-project completed successfully")
            logging.info(f"Raw output from estela-describe-project: {repr(output)}")
            
            # Check if output is empty or just whitespace
            if not output.strip():
                raise Exception("estela-describe-project returned empty output. The project may not have proper spider configuration.")
            
            # Extract JSON from output (it might have warnings/other text mixed in)
            json_line = None
            for line in output.split('\n'):
                line = line.strip()
                if line.startswith('{') and line.endswith('}'):
                    json_line = line
                    break
            
            if not json_line:
                logging.error(f"No JSON found in output: {output}")
                raise Exception(f"estela-describe-project did not return valid JSON. Output was: {repr(output[:500])}")
            
            # Try to parse JSON
            try:
                parsed_output = json.loads(json_line)
            except json.JSONDecodeError as e:
                logging.error(f"Failed to parse JSON line: {json_line}")
                raise Exception(f"estela-describe-project returned invalid JSON: {str(e)}. JSON line was: {repr(json_line)}")
            
            # Check if the expected structure exists
            if not isinstance(parsed_output, dict) or "spiders" not in parsed_output:
                raise Exception(f"estela-describe-project returned unexpected structure. Expected dict with 'spiders' key, got: {repr(parsed_output)}")
            
            spiders = parsed_output["spiders"]
            
            # Validate we found at least one spider
            if not spiders:
                raise Exception("No spiders found in the project. Please ensure your project has at least one spider.")
            
            return spiders
            
        except requests.exceptions.ReadTimeout:
            logging.error("Timeout waiting for estela-describe-project to complete")
            # Try to get logs before killing
            try:
                logs = container.logs().decode('utf-8')
                logging.error(f"Container logs before timeout: {logs}")
            except:
                pass
            container.kill()
            container.remove()
            raise Exception("Spider detection timed out after 240 seconds. The project may be too large or have dependency issues.")
            
    except docker.errors.ContainerError as e:
        error_msg = e.stderr.decode('utf-8') if e.stderr else str(e)
        logging.error(f"Container error: {error_msg}")
        raise Exception(f"Failed to run spider detection container: {error_msg}")
    except json.JSONDecodeError as e:
        logging.error(f"Failed to parse spider detection output: {str(e)}")
        raise Exception(f"Invalid JSON output from spider detection: {str(e)}")
    except Exception as e:
        # Re-raise if it's already our custom exception
        if "Spider detection" in str(e) or "No spiders found" in str(e):
            raise
        # Otherwise wrap it
        logging.error(f"Unexpected error during spider detection: {str(e)}")
        raise Exception(f"Spider detection failed: {str(e)}")


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
        project_dir = unzip_project()
        logging.info("Project downloaded successfully.")
        
        # If we couldn't determine the project directory from the ZIP structure,
        # fall back to finding it in the current directory
        if project_dir is None:
            # List all directories in current directory (excluding hidden ones)
            dirs = [d for d in os.listdir(".") 
                   if os.path.isdir(d) and not d.startswith('.')]
            
            if len(dirs) == 1:
                project_dir = dirs[0]
                logging.info(f"Found project directory: {project_dir}")
            elif len(dirs) == 0:
                raise Exception("No project directory found after extraction")
            else:
                # Try to find the directory with .estela folder
                for d in dirs:
                    if os.path.exists(os.path.join(d, ESTELA_DIR)):
                        project_dir = d
                        logging.info(f"Found project directory with {ESTELA_DIR}: {project_dir}")
                        break
                else:
                    raise Exception(f"Multiple directories found but none contain {ESTELA_DIR}: {dirs}")
        
        PROJECT_PATH = os.path.join(os.path.abspath("."), project_dir)
        DOCKERFILE_PATH = os.path.join(PROJECT_PATH, ESTELA_DIR, DOCKERFILE_NAME)

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
    sys.exit(main())
