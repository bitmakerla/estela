from core.tasks import run_spider_jobs
from core.models import Project, Spider, SpiderJob
from core.kubernetes import delete_job
from tests.base import BaseTestCase


class RunSpiderJobs(BaseTestCase):
    def test_run_jobs(self):
        SpiderJob.objects.filter(status=SpiderJob.WAITING_STATUS).delete()
        project = Project.objects.create(name="project test")
        spider = Spider.objects.create(project=project, name="spider test")
        job = SpiderJob.objects.create(spider=spider)
        self.assertEqual(job.status, SpiderJob.WAITING_STATUS)
        run_spider_jobs()
        job.refresh_from_db()
        self.assertEqual(job.status, SpiderJob.RUNNING_STATUS)
        delete_job(job.name)

    def test_run_jobs_from_endpoint(self):
        SpiderJob.objects.filter(status=SpiderJob.WAITING_STATUS).delete()
        project = Project.objects.create(name="project test 2")
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
        self.assertEqual(response["status"], SpiderJob.WAITING_STATUS)
        run_spider_jobs()
        url_kwargs["jid"] = response["jid"]
        response = self.make_request(
            method="GET",
            user=self.user,
            url_kwargs=url_kwargs,
            status_code=200,
            resource="job-detail",
        )
        self.assertEqual(response["status"], SpiderJob.RUNNING_STATUS)
        self.make_request(
            method="DELETE",
            user=self.user,
            url_kwargs=url_kwargs,
            status_code=204,
            resource="job-detail",
        )
