from api.tokens import account_reset_token
from config.job_manager import job_manager, build_manager
from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.sites.shortcuts import get_current_site
from django.core.mail import EmailMessage
from django.template.loader import render_to_string
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework.authtoken.models import Token


def launch_deploy_job(pid, did, container_image):
    deploy_user = User.objects.get(username="deploy_manager")
    deploy_user_token, _ = Token.objects.get_or_create(user=deploy_user)

    ENV_VARS = {
        "KEY": "{}.{}".format(pid, did),
        "TOKEN": deploy_user_token.key,
        "BUCKET_NAME": settings.PROJECT_BUCKET,
        "CONTAINER_IMAGE": container_image,
        "CREDENTIALS": settings.CREDENTIALS,
        "ENGINE": settings.ENGINE,
        "SPIDERDATA_DB_ENGINE": settings.SPIDERDATA_DB_ENGINE,
        "DJANGO_EXTERNAL_APPS": ",".join(settings.DJANGO_EXTERNAL_APPS),
        "EXTERNAL_MIDDLEWARES": ",".join(settings.EXTERNAL_MIDDLEWARES),
    }

    volume = (
        {"name": "docker-sock", "path": "/var/run"}
        if build_manager.name == "default"
        else {}
    )

    job_manager.create_job(
        name="deploy-project-{}".format(did),
        key=pid,
        job_env_vars=ENV_VARS,
        container_image=settings.BUILD_PROJECT_IMAGE,
        volume=volume,
        command=["python", f"estela-api/build_project/{build_manager.filename}"],
        isbuild=True,
    )


def send_verification_email(user, request):
    mail_subject = "Activate your estela account."
    to_email = user.email
    current_site = get_current_site(request)

    message = render_to_string(
        "acc_active_email.html",
        {
            "user": user,
            "domain": current_site.domain,
            "uid": urlsafe_base64_encode(force_bytes(user.pk)),
            "token": account_reset_token.make_token(user),
        },
    )
    email = EmailMessage(
        mail_subject, message, from_email=settings.VERIFICATION_EMAIL, to=[to_email]
    )
    email.send()


def send_change_password_email(user):
    mail_subject = "Change your estela password."
    to_email = user.email
    estela_domain = settings.CORS_ORIGIN_WHITELIST[0]
    message = render_to_string(
        "change_password_email.html",
        {
            "user": user,
            "domain": estela_domain,
            "uid": urlsafe_base64_encode(force_bytes(user.pk)),
            "token": account_reset_token.make_token(user),
        },
    )
    email = EmailMessage(
        mail_subject, message, from_email=settings.VERIFICATION_EMAIL, to=[to_email]
    )
    email.send()


def send_alert_password_changed(user):
    mail_subject = "Your estela password has been changed."
    to_email = user.email
    message = render_to_string(
        "alert_password_changed.html",
        {
            "user": user,
        },
    )
    email = EmailMessage(
        mail_subject, message, from_email=settings.VERIFICATION_EMAIL, to=[to_email]
    )
    email.send()
