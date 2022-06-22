from engines.config import JobManager
from credentials.config import Credentials
from django.conf import settings
from database_adapters.db_adapters import get_database_interface

credentials = Credentials(plataform=settings.CREDENTIALS)

job_manager = JobManager(engine=settings.ENGINE)

job_manager.JOB_TIME_CREATION = 20
job_manager.CREDENTIALS = credentials

spiderdata_db_client = get_database_interface(
    engine=settings.SPIDERDATA_DB_ENGINE,
    connection=settings.SPIDERDATA_DB_CONNECTION,
    production=settings.SPIDERDATA_DB_PRODUCTION,
    certificate_path=settings.SPIDERDATA_DB_CERTIFICATE_PATH,
)
