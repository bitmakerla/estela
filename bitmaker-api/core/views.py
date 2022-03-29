from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from config.job_manager import job_manager

from django.conf import settings


def launch_deploy_job(pid, did, container_image):
    deploy_user = User.objects.get(username="deploy_manager")
    deploy_user_token, _ = Token.objects.get_or_create(user=deploy_user)

    ENV_VARS = {
        "KEY": "{}.{}".format(pid, did),
        "TOKEN": deploy_user_token.key,
        "BUCKET_NAME": settings.PROJECT_BUCKET,
        "CONTAINER_IMAGE": container_image,
    }
    volume = {"name": "docker-sock", "path": "/var/run"}
    job_manager.create_job(
        name="deploy-project-{}".format(did),
        key=pid,
        job_env_vars=ENV_VARS,
        container_image=settings.BUILD_PROJECT_IMAGE,
        volume=volume,
        command=["python", "build.py"],
        isbuild=True,
    )
