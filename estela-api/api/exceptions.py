from rest_framework.exceptions import APIException
from rest_framework import status

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


class InvalidDateFormatException(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = (
        "Invalid date format. Please provide dates in the format YYYY-MM-DD."
    )
    default_code = "invalid_date_format"
