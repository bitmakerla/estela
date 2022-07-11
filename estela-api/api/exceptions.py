from rest_framework.exceptions import APIException

from api import errors


class DataBaseError(APIException):
    status_code = 404
    default_detail = errors.UNABLE_CONNECT_DB
    default_code = "Unable connect Database"