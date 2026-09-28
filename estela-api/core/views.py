from config.job_manager import job_manager
from django.conf import settings
from django.contrib.auth.models import User

from core.models import Deploy


def launch_deploy_job(pid, did, container_image):
    # The build acts as deploy_manager, as before, but holds a token good for this deploy
    # only instead of deploy_manager's DRF token, which could report on any deploy anywhere.
    from api.authentication import issue_run_token

    deploy_user = User.objects.get(username="deploy_manager")
    run_token = issue_run_token(deploy_user, deploy=Deploy.objects.get(did=did))

    ENV_VARS = {
        "KEY": "{}.{}".format(pid, did),
        "TOKEN": run_token,
        "BUCKET_NAME": settings.PROJECT_BUCKET,
        "CONTAINER_IMAGE": container_image,
        "CREDENTIALS": settings.CREDENTIALS,
        "ENGINE": settings.ENGINE,
        "SPIDERDATA_DB_ENGINE": settings.SPIDERDATA_DB_ENGINE,
        "DJANGO_EXTERNAL_APPS": ",".join(settings.DJANGO_EXTERNAL_APPS),
        "EXTERNAL_MIDDLEWARES": ",".join(settings.EXTERNAL_MIDDLEWARES),
        "REPOSITORY_NAME": settings.REPOSITORY_NAME,
        "REGISTRY_HOST": settings.REGISTRY_HOST,
    }

    # No volume needed for Kaniko builds - uses shared volumes internally
    volume = {}

    # Use Kaniko 3-container pipeline instead of Docker-in-Docker
    job_manager.create_job(
        name="deploy-project-{}".format(did),
        key=pid,
        job_env_vars=ENV_VARS,
        container_image=container_image,  # Use actual target image
        volume=volume,
        command=["estela-report-deploy"],  # Command for spider-status container
        isbuild=True,  # Triggers Kaniko 3-container pipeline
    )
