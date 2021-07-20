from core.kubernetes import get_api_instance, create_job, delete_job, read_job
from tests.base import BaseTestCase, TEST_DOCKER_IMAGE, TEST_SPIDER


class TestKubernetes(BaseTestCase):
    job_api_instance = get_api_instance("SINGLE_JOB")
    cron_job_api_instance = get_api_instance("CRON_JOB")

    def test_kubernetes_api(self):
        items = self.job_api_instance.list_job_for_all_namespaces().items
        self.assertEqual(type(items), list)
        items = self.job_api_instance.list_namespaced_job("default").items
        self.assertEqual(type(items), list)
        items = self.cron_job_api_instance.list_cron_job_for_all_namespaces().items
        self.assertEqual(type(items), list)
        items = self.cron_job_api_instance.list_namespaced_cron_job("default").items
        self.assertEqual(type(items), list)

    def test_create_job(self):
        response = create_job(
            "test1",
            TEST_SPIDER,
            {},
            TEST_DOCKER_IMAGE,
            "SINGLE_JOB",
            api_instance=self.job_api_instance,
        )
        delete_job("test1", job_type="SINGLE_JOB")
        self.assertEqual(response._metadata.name, "test1")

    def test_read_job(self):
        create_job(
            "test2",
            TEST_SPIDER,
            {},
            TEST_DOCKER_IMAGE,
            "SINGLE_JOB",
            api_instance=self.job_api_instance,
        )
        response = read_job("test2", job_type="SINGLE_JOB")
        delete_job("test2", job_type="SINGLE_JOB")
        self.assertEqual(response._metadata.name, "test2")

    def test_delete_job(self):
        create_job(
            "test3",
            TEST_SPIDER,
            {},
            TEST_DOCKER_IMAGE,
            "SINGLE_JOB",
            api_instance=self.job_api_instance,
        )
        response = delete_job("test3", job_type="SINGLE_JOB")
        self.assertIsNone(response.message)

    def test_create_cron_job(self):
        response = create_job(
            "test4",
            TEST_SPIDER,
            {},
            TEST_DOCKER_IMAGE,
            "CRON_JOB",
            api_instance=self.cron_job_api_instance,
        )
        delete_job("test4", job_type="CRON_JOB")
        self.assertEqual(response._metadata.name, "test4")

    def test_read_cron_job(self):
        create_job(
            "test5",
            TEST_SPIDER,
            {},
            TEST_DOCKER_IMAGE,
            "CRON_JOB",
            api_instance=self.cron_job_api_instance,
        )
        response = read_job("test5", job_type="CRON_JOB")
        delete_job("test5", job_type="CRON_JOB")
        self.assertEqual(response._metadata.name, "test5")

    def test_delete_cron_job(self):
        create_job(
            "test6",
            TEST_SPIDER,
            {},
            TEST_DOCKER_IMAGE,
            "CRON_JOB",
            api_instance=self.cron_job_api_instance,
        )
        response = delete_job("test6", job_type="CRON_JOB")
        self.assertIsNone(response.message)
