from api import errors
from core.models import Spider
from tests.base import BaseTestCase


class SpiderList(BaseTestCase):
    resource = "spider-list"

    def test_get_spiders(self):
        project = self.user.project_set.create(name="test_project")
        spider_1 = Spider.objects.create(project=project, name="test_spider_1")
        spider_2 = Spider.objects.create(project=project, name="test_spider_2")
        url_kwargs = {"pid": project.pid}
        response = self.make_request(
            method="GET",
            url_kwargs=url_kwargs,
            user=self.user,
            paginated=True,
        )
        response_sids = [spider["sid"] for spider in response]
        self.assertIn(spider_1.sid, response_sids)
        self.assertIn(spider_2.sid, response_sids)

    def test_token_auth_failed(self):
        token = "invalidtoken"
        url_kwargs = {"pid": "1"}
        response = self.make_request(
            method="GET",
            url_kwargs=url_kwargs,
            token=token,
            status_code=401,
        )
        self.assertEqual(response.get("detail"), errors.INVALID_TOKEN)

    def test_create_spider(self):
        project = self.user.project_set.create(name="test_project")
        data = {"name": "test_spider", "pid": project.pid}
        url_kwargs = {"pid": project.pid}
        response = self.make_request(
            method="POST",
            user=self.user,
            url_kwargs=url_kwargs,
            data=data,
            status_code=201,
        )
        self.assertEqual(data["name"], response["name"])
        self.assertTrue(project.spiders.filter(sid=response["sid"]).exists())

    def test_check_paginated_response(self):
        project = self.user.project_set.create(name="test_project")
        url_kwargs = {
            "pid": project.pid,
        }
        response = self.make_request(
            method="GET", url_kwargs=url_kwargs, user=self.user
        )
        self.assertEqual({"count", "previous", "next", "results"}, set(response.keys()))
        self.assertIsInstance(response["results"], list)
        self.assertIsInstance(response["count"], int)

    def test_no_token_auth_failed(self):
        url_kwargs = {"pid": "1"}
        response = self.make_request(
            method="GET",
            url_kwargs=url_kwargs,
            status_code=401,
        )
        self.assertEqual(response.get("detail"), errors.NO_AUTH_CREDENTIALS)


class SpiderDetail(BaseTestCase):
    resource = "spider-detail"

    def test_get_spider(self):
        project = self.user.project_set.create(name="test_project")
        spider = Spider.objects.create(project=project, name="test_spider")
        url_kwargs = {
            "pid": project.pid,
            "sid": spider.sid,
        }
        response = self.make_request(
            method="GET",
            user=self.user,
            url_kwargs=url_kwargs,
        )
        self.assertEqual(response["sid"], spider.sid)
        self.assertEqual(response["name"], spider.name)
        self.assertEqual(response["project"], str(project.pid))

    def test_delete_spider(self):
        project = self.user.project_set.create(name="test_project")
        spider = Spider.objects.create(project=project, name="test_spider")
        url_kwargs = {
            "pid": project.pid,
            "sid": spider.sid,
        }
        self.make_request(
            method="DELETE",
            user=self.user,
            url_kwargs=url_kwargs,
            status_code=204,
        )
        self.assertFalse(project.spiders.filter(sid=spider.sid).exists())

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

    def test_no_token_auth_failed(self):
        url_kwargs = {
            "pid": "1",
            "sid": 1,
        }
        response = self.make_request(
            method="GET",
            url_kwargs=url_kwargs,
            status_code=401,
        )
        self.assertEqual(response.get("detail"), errors.NO_AUTH_CREDENTIALS)
