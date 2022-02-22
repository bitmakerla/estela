from engines.config import JobManager


job_manager = JobManager(engine="kubernetes")

job_manager.JOB_TIME_CREATION = 20
