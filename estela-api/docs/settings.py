from drf_yasg import openapi
from drf_yasg.generators import OpenAPISchemaGenerator

DEFAULT_BASE_PATH = "/"


api_info = openapi.Info(
    title="estela API v1.0 Documentation",
    default_version="v1",
    description="estela API Swagger Specification",
)


class APISchemeGenerator(OpenAPISchemaGenerator):
    def determine_path_prefix(self, paths):
        return DEFAULT_BASE_PATH
