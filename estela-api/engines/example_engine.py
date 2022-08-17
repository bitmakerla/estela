class ExampleEngine:
    SPIDER_JOB_COMMANDS = ["estela-crawl"]  # Command to init crawling.
    JOB_TIME_CREATION = 20  # Tolerance time for a Job to be created.

    class Status:
        def __init__(self):
            self.active = None
            self.succeeded = None
            self.failed = None

    class Job:
        def __init__(self):
            self.name = "Job Name"
            self.status = self.Status()

    def create_job(self):
        return self.Job()

    def delete_job(self):
        pass

    def read_job(self, job_name):
        return self.Job()

    def read_job_status(self, job_name):
        return self.Status()

    def get_scale_size(self):
        pass
