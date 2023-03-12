from rest_framework.exceptions import APIException

from api import errors


class DataBaseError(APIException):
    status_code = 404
    default_detail = errors.UNABLE_CONNECT_DB
    default_code = "unable_connect_database"


class EmailServiceError(APIException):
    status_code = 500
    default_code = "unable_send_email"

class UserNotFoundError(APIException):
    status_code = 404
    default_detail = errors.USER_NOT_FOUND
    default_code = "user_not_found"

class ChangePasswordError(APIException):
    status_code = 400
    default_detail = errors.UNABLE_CHANGE_PASSWORD
    default_code = "unable_change_password"