from engines.config import JobManager
from credentials.config import Credentials
from django.conf import settings

credentials = Credentials(plataform=settings.CREDENTIALS)

job_manager = JobManager(engine=settings.ENGINE)

job_manager.JOB_TIME_CREATION = 20
job_manager.CREDENTIALS = credentials
