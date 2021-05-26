from api import errors
from core.models import Spider, SpiderJob
from core import kubernetes
from tests.base import BaseTestCase


class SpiderJobList(BaseTestCase):
    resource = "job-list"

    def test_get_spiders_jobs(self):
        project = self.user.project_set.create(name="test_project")
        spider = Spider.objects.create(project=project, name="test_spider")
        job_1 = SpiderJob.objects.create(spider=spider)
        job_2 = SpiderJob.objects.create(spider=spider)
        url_kwargs = {
            "pid": project.pid,
            "sid": spider.sid,
        }
        response = self.make_request(
            method="GET",
            url_kwargs=url_kwargs,
            user=self.user,
            paginated=True,
        )
        response_jids = [job["jid"] for job in response]
        self.assertIn(job_1.jid, response_jids)
        self.assertIn(job_2.jid, response_jids)

    def test_token_auth_failed(self):
        token = "invalidtoken"
        url_kwargs = {
            "pid": "1",
            "sid": 1,
        }
        response = self.make_request(
            method="GET",
            url_kwargs=url_kwargs,
            token=token,
            status_code=401,
        )
        self.assertEqual(response.get("detail"), errors.INVALID_TOKEN)

    def test_create_spider_job(self):
        project = self.user.project_set.create(name="test_project")
        spider = Spider.objects.create(project=project, name="test_spider")
        url_kwargs = {
            "pid": project.pid,
            "sid": spider.sid,
        }
        response = self.make_request(
            method="POST",
            user=self.user,
            url_kwargs=url_kwargs,
            status_code=201,
        )
        self.assertTrue(spider.jobs.filter(jid=response["jid"]).exists())

        api_instance = kubernetes.get_api_instance()
        kube_response = kubernetes.read_job(response["name"], api_instance=api_instance)
        self.assertEqual(kube_response._metadata.name, response["name"])
        kubernetes.delete_job(response["name"], api_instance=api_instance)

    def test_check_paginated_response(self):
        project = self.user.project_set.create(name="test_project")
        spider = Spider.objects.create(project=project, name="test_spider")
        url_kwargs = {
            "pid": project.pid,
            "sid": spider.sid,
        }
        response = self.make_request(
            method="GET", url_kwargs=url_kwargs, user=self.user
        )
        self.assertEqual({"count", "previous", "next", "results"}, set(response.keys()))
        self.assertIsInstance(response["results"], list)
        self.assertIsInstance(response["count"], int)

    def test_no_token_auth_failed(self):
        url_kwargs = {
            "pid": "1",
            "sid": "1",
        }
        response = self.make_request(
            method="GET",
            url_kwargs=url_kwargs,
            status_code=401,
        )
        self.assertEqual(response.get("detail"), errors.NO_AUTH_CREDENTIALS)


class SpiderJobDetail(BaseTestCase):
    resource = "job-detail"

    def test_get_spider_job(self):
        project = self.user.project_set.create(name="test_project")
        spider = Spider.objects.create(project=project, name="test_spider")
        job = SpiderJob.objects.create(spider=spider)
        url_kwargs = {
            "pid": project.pid,
            "sid": spider.sid,
            "jid": job.jid,
        }
        response = self.make_request(
            method="GET",
            user=self.user,
            url_kwargs=url_kwargs,
        )
        self.assertEqual(response["jid"], job.jid)
        self.assertEqual(response["spider"], spider.sid)
        self.assertIn("created", response)
        self.assertIn("status", response)

    def test_delete_spider_job(self):
        project = self.user.project_set.create(name="test_project")
        spider = Spider.objects.create(project=project, name="test_spider")
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
        self.assertTrue(spider.jobs.filter(jid=response["jid"]).exists())
        url_kwargs["jid"] = response["jid"]
        self.make_request(
            method="DELETE",
            user=self.user,
            url_kwargs=url_kwargs,
            status_code=204,
            resource="job-detail",
        )

    def test_token_auth_failed(self):
        token = "invalidtoken"
        url_kwargs = {
            "pid": 1,
            "sid": 1,
            "jid": 1,
        }
        response = self.make_request(
            method="GET",
            url_kwargs=url_kwargs,
            token=token,
            status_code=401,
        )
        self.assertEqual(response.get("detail"), errors.INVALID_TOKEN)

    def test_no_token_auth_failed(self):
        url_kwargs = {
            "pid": 1,
            "sid": 1,
            "jid": 1,
        }
        response = self.make_request(
            method="GET",
            url_kwargs=url_kwargs,
            status_code=401,
        )
        self.assertEqual(response.get("detail"), errors.NO_AUTH_CREDENTIALS)
