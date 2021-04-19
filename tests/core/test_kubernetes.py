from core.kubernetes import get_api_instance, create_job, delete_job, read_job
from tests.base import BaseTestCase, TEST_DOCKER_IMAGE


class TestKubernetes(BaseTestCase):
    api_instance = get_api_instance()

    def test_kubernetes_api(self):
        items = self.api_instance.list_job_for_all_namespaces().items
        self.assertEqual(type(items), list)
        items = self.api_instance.list_namespaced_job('default').items
        self.assertEqual(type(items), list)

    def test_create_job(self):
        response = create_job('test1', TEST_DOCKER_IMAGE, api_instance=self.api_instance)
        delete_job('test1')
        self.assertEqual(response._metadata.name, 'test1')

    def test_read_job(self):
        create_job('test2', TEST_DOCKER_IMAGE, api_instance=self.api_instance)
        response = read_job('test2')
        delete_job('test2')
        self.assertEqual(response._metadata.name, 'test2')

    def test_delete_job(self):
        create_job('test3', TEST_DOCKER_IMAGE, api_instance=self.api_instance)
        response = delete_job('test3')
        self.assertIsNone(response.message)
