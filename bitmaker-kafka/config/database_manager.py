import os

from database_adapters.db_adapters import get_database_interface

if os.getenv("PRODUCTION") == "False":
    db_production = False
else:
    db_production = True
db_certificate_path = "config/mongo_certificate/ca-certificate.crt"
db_client = get_database_interface(
    engine=os.getenv("DB_ENGINE"),
    connection=os.getenv("DB_CONNECTION"),
    production=db_production,
    certificate_path=db_certificate_path,
)
