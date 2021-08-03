from core.kubernetes import (
    get_api_instance,
    create_job,
    delete_job,
    read_job,
    read_job_status,
    SINGLE_JOB,
    CRON_JOB,
)
from tests.base import BaseTestCase, TEST_DOCKER_IMAGE, TEST_SPIDER


class TestKubernetes(BaseTestCase):
    job_api_instance = get_api_instance(SINGLE_JOB)
    cron_job_api_instance = get_api_instance(CRON_JOB)

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
            "1.1.1",
            TEST_SPIDER,
            {},
            TEST_DOCKER_IMAGE,
            api_instance=self.job_api_instance,
        )
        delete_job("test1", api_instance=self.job_api_instance)
        self.assertEqual(response._metadata.name, "test1")

    def test_read_job(self):
        create_job(
            "test2",
            "1.1.1",
            TEST_SPIDER,
            {},
            TEST_DOCKER_IMAGE,
            api_instance=self.job_api_instance,
        )
        response = read_job("test2", api_instance=self.job_api_instance)
        delete_job("test2", api_instance=self.job_api_instance)
        self.assertEqual(response._metadata.name, "test2")

    def test_delete_job(self):
        create_job(
            "test3",
            "1.1.1",
            TEST_SPIDER,
            {},
            TEST_DOCKER_IMAGE,
            api_instance=self.job_api_instance,
        )
        response = delete_job("test3", api_instance=self.job_api_instance)
        self.assertIsNone(response.message)

    def test_create_cron_job(self):
        response = create_job(
            "test4",
            "1.1.1",
            TEST_SPIDER,
            {},
            TEST_DOCKER_IMAGE,
            CRON_JOB,
            api_instance=self.cron_job_api_instance,
        )
        delete_job(
            "test4",
            job_type=CRON_JOB,
            api_instance=self.cron_job_api_instance,
        )
        self.assertEqual(response._metadata.name, "test4")

    def test_read_cron_job(self):
        create_job(
            "test5",
            "1.1.1",
            TEST_SPIDER,
            {},
            TEST_DOCKER_IMAGE,
            CRON_JOB,
            api_instance=self.cron_job_api_instance,
        )
        response = read_job(
            "test5",
            job_type=CRON_JOB,
            api_instance=self.cron_job_api_instance,
        )
        delete_job(
            "test5",
            job_type=CRON_JOB,
            api_instance=self.cron_job_api_instance,
        )
        self.assertEqual(response._metadata.name, "test5")

    def test_delete_cron_job(self):
        create_job(
            "test6",
            "1.1.1",
            TEST_SPIDER,
            {},
            TEST_DOCKER_IMAGE,
            CRON_JOB,
            api_instance=self.cron_job_api_instance,
        )
        response = delete_job(
            "test6",
            job_type=CRON_JOB,
            api_instance=self.cron_job_api_instance,
        )
        self.assertIsNone(response.message)

    def test_read_status_job(self):
        create_job(
            "test7",
            "1.1.1",
            TEST_SPIDER,
            {},
            TEST_DOCKER_IMAGE,
            api_instance=self.job_api_instance,
        )
        response = read_job_status("test7", api_instance=self.job_api_instance)
        self.assertIsNotNone(response)
        delete_job("test7", api_instance=self.job_api_instance)

    def test_read_status_cron_job(self):
        create_job(
            "test8",
            "1.1.1",
            TEST_SPIDER,
            {},
            TEST_DOCKER_IMAGE,
            CRON_JOB,
            api_instance=self.cron_job_api_instance,
        )
        response = read_job_status(
            "test8",
            job_type=CRON_JOB,
            api_instance=self.cron_job_api_instance,
        )
        self.assertIsNotNone(response)
        delete_job("test8", job_type=CRON_JOB)
