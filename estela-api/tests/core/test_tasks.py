from unittest.mock import patch

from config.job_manager import job_manager
from core.cronjob import create_cronjob, delete_cronjob
from core.models import Project, Spider, SpiderJob
from core.tasks import run_spider_jobs
from tests.base import BaseTestCase


class RunSpiderJobs(BaseTestCase):
    @patch("core.tasks._get_cluster_resources", return_value=(12.0, 32e9, 0.0, 0.0))
    def test_run_jobs_dispatches_sequentially(self, mock_resources):
        """run_spider_jobs should dispatch IN_QUEUE jobs directly to K8s."""
        SpiderJob.objects.filter(status=SpiderJob.IN_QUEUE_STATUS).delete()
        project = Project.objects.create(name="project test")
        spider = Spider.objects.create(project=project, name="spider test")
        job = SpiderJob.objects.create(spider=spider, status=SpiderJob.IN_QUEUE_STATUS)
        run_spider_jobs()
        job.refresh_from_db()
        self.assertEqual(job.status, SpiderJob.WAITING_STATUS)
        job_info = job_manager.read_job(job.name)
        self.assertIsNotNone(job_info)
        job_manager.delete_job(job.name)

    @patch("core.tasks._get_cluster_resources", return_value=None)
    def test_run_jobs_stops_when_no_capacity(self, mock_resources):
        """run_spider_jobs should stop dispatching when cluster resources unavailable."""
        SpiderJob.objects.filter(status=SpiderJob.IN_QUEUE_STATUS).delete()
        project = Project.objects.create(name="project test")
        spider = Spider.objects.create(project=project, name="spider test")
        job = SpiderJob.objects.create(spider=spider, status=SpiderJob.IN_QUEUE_STATUS)
        run_spider_jobs()
        job.refresh_from_db()
        self.assertEqual(job.status, SpiderJob.IN_QUEUE_STATUS)

    def test_create_job_default_async(self):
        """Creating a job without params should save as IN_QUEUE (async by default)."""
        SpiderJob.objects.filter(status=SpiderJob.IN_QUEUE_STATUS).delete()
        project = self.user.project_set.create(
            name="project test 2", through_defaults={"permission": "OWNER"}
        )
        spider = Spider.objects.create(project=project, name="spider test")
        url_kwargs = {
            "pid": project.pid,
            "sid": spider.sid,
        }
        response = self.make_request(
            method="POST",
            user=self.user,
            url_kwargs=url_kwargs,
            status_code=201,
            resource="job-list",
        )
        self.assertEqual(response["job_status"], SpiderJob.IN_QUEUE_STATUS)

    def test_create_cronjob(self):
        response = create_cronjob("1.1.1", "1.1.1", [], [], [], "* * * * *")
        delete_cronjob(response.name)
        self.assertEqual(response.name, "1.1.1")

    def test_delete_cronjob(self):
        cronjob = create_cronjob("1.1.1", "1.1.1", [], [], [], "* * * * *")
        response = delete_cronjob(cronjob.name)
        self.assertEqual(response, True)
