---
layout: page
title: Credentials
parent: API
grand_parent: Bitmaker Cloud
---

# Credentials

The project needs a Docker image registry and a place to save uploaded projects in order to work. The credentials
module will take care of calling the appropriate methods to access both the registry and the place where the projects
are saved, fetching any required credentials.

We currently support credentials for AWS (which will use AWS ECR as its container registry) and local credentials
(which will use a local registry container which runs as a docker container and [minio](https://min.io/) for project
storage).

Suppose you want to use other services for the registry container and project storage. In that case, you need to
define a new credentials as a class. Add your credentials in `credentials/config.py` with a name:

```py
def Credentials(plataform):
    credentials = {
        "aws": AWSCredentials,
        "local": LocalCredentials,
        "your_credentials": YourCredentials,
    }

    return credentials[plataform]()
```

To use it, just define it in `config/job_manager.py`:
```py
credentials = Credentials(plataform="your_credentials")
```

### Credentials interface:
Your credentials class should ideally inherit from the base `Credentials` class and implement the following
methods:

- **__init__(self)**: Here you should set any required secrets and configurations in the credentials attribute.
    E.g., `self.credentials["AWS_ACCESS_KEY_ID"] = settings.AWS_ACCESS_KEY_ID`.
- **get_registry_token(self)**: It should return the token required to access the container registry. In case no 
    token is required, it may return None.
- **download_project(self, bucket_name, project_name)**: It should implement the logic to download an object (project)
    from a specific bucket.
- **upload_project(self, project_name, project_obj)**: It should implement the logic to upload a project object (ZIP file)
    to the projects bucket.
- **get_credentials(self)**: It should return the `credentials` member, which should contain all required secrets.

You can take the [`AWSCredentials`](https://github.com/bitmakerla/bitmaker-cloud/blob/main/bitmaker-api/credentials/aws.py) class as an example.
