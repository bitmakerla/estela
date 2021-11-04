from core.tasks import run_spider_jobs
from core.models import Project, Spider, SpiderJob
from core.kubernetes import delete_job, read_job
from core.cronjob import create_cronjob, delete_cronjob
from tests.base import BaseTestCase


class RunSpiderJobs(BaseTestCase):
    def test_run_jobs(self):
        SpiderJob.objects.filter(status=SpiderJob.IN_QUEUE_STATUS).delete()
        project = Project.objects.create(name="project test")
        spider = Spider.objects.create(project=project, name="spider test")
        job = SpiderJob.objects.create(spider=spider, status=SpiderJob.IN_QUEUE_STATUS)
        run_spider_jobs()
        job_info = read_job(job.name)
        self.assertIsNotNone(job_info)
        delete_job(job.name)

    def test_run_jobs_from_endpoint(self):
        SpiderJob.objects.filter(status=SpiderJob.IN_QUEUE_STATUS).delete()
        project = self.user.project_set.create(name="project test 2")
        spider = Spider.objects.create(project=project, name="spider test")
        url_kwargs = {
            "pid": project.pid,
            "sid": spider.sid,
        }
        params = {"async": True}
        response = self.make_request(
            method="POST",
            user=self.user,
            url_kwargs=url_kwargs,
            status_code=201,
            resource="job-list",
            params=params,
        )
        self.assertEqual(response["job_status"], SpiderJob.IN_QUEUE_STATUS)
        run_spider_jobs()
        url_kwargs["jid"] = response["jid"]
        response = self.make_request(
            method="GET",
            user=self.user,
            url_kwargs=url_kwargs,
            resource="job-detail",
        )
        delete_job(response["name"])

    def test_create_cronjob(self):
        response = create_cronjob("1.1.1", [], [], [], "* * * * *")
        delete_cronjob(response.name)
        self.assertEqual(response.name, "1.1.1")

    def test_delete_cronjob(self):
        cronjob = create_cronjob("1.1.1", [], [], [], "* * * * *")
        response = delete_cronjob(cronjob.name)
        self.assertEqual(response, True)
