from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from rest_framework.reverse import reverse
from rest_framework.test import APITestCase

import json

TEST_DOCKER_IMAGE = "094814489188.dkr.ecr.us-east-2.amazonaws.com/bitmaker-project-demo:test"
TEST_SPIDER = "books"


class BaseTestCase(APITestCase):
    resource = None

    def setUp(self):
        self.user = User.objects.create_user(username="user-test")

    def get_response_content(self, response, status_code):
        if status_code:
            self.assertEqual(response.status_code, status_code)
        response_content = response.content
        if response_content:
            response_content = json.loads(response_content)
        return response_content

    def get_user_token(self, user):
        token, _ = Token.objects.get_or_create(user=user)
        token = token.key
        return token

    def make_request(
        self,
        method,
        resource=None,
        url_kwargs=None,
        data=None,
        user=None,
        status_code=200,
        token=None,
        paginated=False,
        load_all_content=True,
        params=None,
    ):
        resource = resource or self.resource
        url = reverse(resource, kwargs=url_kwargs)

        if method == "GET":
            request_func = self.client.get
        elif method == "UPDATE":
            request_func = self.client.put
        elif method == "PATCH":
            request_func = self.client.patch
        elif method == "DELETE":
            request_func = self.client.delete
        else:
            request_func = self.client.post

        if user is None and token is None:
            self.client.credentials()
        elif user:
            token = self.get_user_token(user)

        if token:
            self.client.credentials(HTTP_AUTHORIZATION="Token {}".format(token))

        if params is not None:
            url += "?{}".format(
                "&".join(
                    ["{}={}".format(param, value) for param, value in params.items()]
                )
            )

        response = request_func(url, format="json", data=data)
        response_content = self.get_response_content(response, status_code)

        if paginated:
            if load_all_content:
                next_page = response_content["next"]
                content = response_content["results"]
                while next_page:
                    response = self.client.get(next_page, format="json", data=data)
                    response_content = self.get_response_content(response, status_code)
                    content += response_content["results"]
                    next_page = response_content["next"]
                return content
            return response_content["results"]

        return response_content
