from core.models import SpiderJob
from django.template.loader import render_to_string
from django.core.mail import EmailMessage

from django.conf import settings

def report_failed_job(job: SpiderJob):
    users = job.spider.project.users
    estela_domain = settings.CORS_ORIGIN_WHITELIST[0]
    for user in users:
        mail_subject = "Your estela job has failed."
        to_email = user.email
        message = render_to_string(
            "report_failed_job.html",
            {
                "user": user,
                "job": job,
                "sid": job.spider.sid,
                "pid": job.spider.project.pid,
                "domain": estela_domain,
            },
        )
        mail = EmailMessage(
            mail_subject, message, from_email=settings.VERIFICATION_EMAIL, to=[to_email]
        )
        mail.send()