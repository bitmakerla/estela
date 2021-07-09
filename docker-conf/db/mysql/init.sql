CREATE DATABASE IF NOT EXISTS bitmaker;

CREATE USER 'django-api'@'localhost' IDENTIFIED BY 'bitmaker12345';
GRANT ALL PRIVILEGES ON *.* TO 'django-api'@'localhost' WITH GRANT OPTION;
CREATE USER 'django-api'@'%' IDENTIFIED BY 'bitmaker12345';
GRANT ALL PRIVILEGES ON *.* TO 'django-api'@'%' WITH GRANT OPTION;
