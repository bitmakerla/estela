"""The token a job's container reports back with: its own job, only to update it, only while
the job runs."""

from rest_framework.test import APITestCase

from api.authentication import issue_run_token
from core.models import Spider, SpiderJob
from django.contrib.auth.models import User


class RunTokenTest(APITestCase):
    def setUp(self):
        owner = User.objects.create_user(username="owner")
        self.project = owner.project_set.create(
            name="p", through_defaults={"permission": "OWNER"}
        )
        self.spider = Spider.objects.create(project=self.project, name="s")
        self.job = SpiderJob.objects.create(spider=self.spider, status=SpiderJob.RUNNING_STATUS)
        self.other_job = SpiderJob.objects.create(spider=self.spider, status=SpiderJob.RUNNING_STATUS)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {issue_run_token(owner, job=self.job)}")

    def job_url(self, job):
        return f"/api/projects/{self.project.pid}/spiders/{self.spider.sid}/jobs/{job.jid}"

    def test_updates_its_own_job(self):
        response = self.client.patch(self.job_url(self.job), {"status": SpiderJob.RUNNING_STATUS})
        self.assertEqual(response.status_code, 200, response.content)

    def test_nothing_else(self):
        self.assertEqual(self.client.patch(self.job_url(self.other_job), {"status": "RUNNING"}).status_code, 403)
        self.assertEqual(self.client.get(self.job_url(self.job)).status_code, 403)
        # Views that do not list run tokens do not even recognise one.
        self.assertEqual(self.client.get("/api/projects").status_code, 401)
        self.assertEqual(self.client.post("/api/account/api-keys", {"name": "x"}).status_code, 401)

    def test_dies_with_the_run(self):
        SpiderJob.objects.filter(pk=self.job.pk).update(status=SpiderJob.COMPLETED_STATUS)
        response = self.client.patch(self.job_url(self.job), {"status": SpiderJob.RUNNING_STATUS})
        self.assertEqual(response.status_code, 401)
