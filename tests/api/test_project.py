from api import errors
from tests.base import BaseTestCase


class ProjectList(BaseTestCase):
    resource = 'project-list'
    url_kwargs = {}

    def test_get_projects(self):
        project_1 = self.user.project_set.create(name='test_project_1')
        project_2 = self.user.project_set.create(name='test_project_2')
        response = self.make_request(
            method='GET',
            url_kwargs=self.url_kwargs,
            user=self.user,
            paginated=True,
        )
        response_pids = [project['pid'] for project in response]
        self.assertIn(str(project_1.pid), response_pids)
        self.assertIn(str(project_2.pid), response_pids)

    def test_token_auth_failed(self):
        token = 'invalidtoken'
        response = self.make_request(
            method='GET',
            url_kwargs=self.url_kwargs,
            token=token,
            status_code=401,
        )
        self.assertEqual(response.get('detail'), errors.INVALID_TOKEN)

    def test_create_project(self):
        data = {'name': 'test'}
        response = self.make_request(
            method='POST',
            user=self.user,
            url_kwargs=self.url_kwargs,
            data=data,
            status_code=201,
        )
        self.assertEqual(data['name'], response['name'])
        self.assertTrue(self.user.project_set.filter(pid=response['pid']).exists())

    def test_check_paginated_response(self):
        response = self.make_request(method='GET', url_kwargs=self.url_kwargs, user=self.user)
        self.assertEqual({'count', 'previous', 'next', 'results'}, set(response.keys()))
        self.assertIsInstance(response['results'], list)
        self.assertIsInstance(response['count'], int)

    def test_no_token_auth_failed(self):
        response = self.make_request(
            method='GET',
            url_kwargs=self.url_kwargs,
            status_code=401,
        )
        self.assertEqual(response.get('detail'), errors.NO_AUTH_CREDENTIALS)


class ProjectDetail(BaseTestCase):
    resource = 'project-detail'

    def test_get_project(self):
        project = self.user.project_set.create(name='test_project')
        url_kwargs = {'pid': project.pid}
        response = self.make_request(
            method='GET',
            user=self.user,
            url_kwargs=url_kwargs,
        )
        self.assertEqual(response['pid'], str(project.pid))
        self.assertEqual(response['name'], project.name)

    def test_update_project(self):
        project = self.user.project_set.create(name='test_project')
        url_kwargs = {'pid': project.pid}
        data = {'name': 'new_name'}
        self.make_request(
            method='UPDATE',
            user=self.user,
            url_kwargs=url_kwargs,
            data=data,
        )
        project.refresh_from_db()
        self.assertEqual(project.name, data['name'])

    def test_delete_project(self):
        project = self.user.project_set.create(name='test_project')
        url_kwargs = {'pid': project.pid}
        self.make_request(
            method='DELETE',
            user=self.user,
            url_kwargs=url_kwargs,
            status_code=204,
        )
        self.assertFalse(self.user.project_set.filter(pid=project.pid).exists())

    def test_token_auth_failed(self):
        token = 'invalidtoken'
        url_kwargs = {'pid': '1'}
        response = self.make_request(
            method='GET',
            url_kwargs=url_kwargs,
            token=token,
            status_code=401,
        )
        self.assertEqual(response.get('detail'), errors.INVALID_TOKEN)

    def test_no_token_auth_failed(self):
        url_kwargs = {'pid': '1'}
        response = self.make_request(
            method='GET',
            url_kwargs=url_kwargs,
            status_code=401,
        )
        self.assertEqual(response.get('detail'), errors.NO_AUTH_CREDENTIALS)
