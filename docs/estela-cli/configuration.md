---
layout: page
title: Configuration
nav_order: 3
parent: estela CLI
---

# estela CLI Configuration
The estela CLI is configured via two YAML files:
- `~/.estela.yaml`: This file contains global configuration like your API key
  and the current active project in your context.
- `estela.yaml`: This file contains local configuration like the project ID or
  the Python version to use when building the Docker image of your project. This
  file is automatically created in your project directory when you run `estela init <project_id>`.

## Configuration options
The following is a list of the currently available configuration options:

|Option|Description|Location|
| ---- | --------- | ------ |
|`python`|Python version to use to build the Scrapy project's image.|`estela.yaml`|
|`requirements`|Path to the projects' requirements file.|`estela.yaml`|
|`ignore`|List of comma-separated paths of files and directories to ignore when deploying your project's image. E.g., it should include your virtual environment.|`estela.yaml`|
|`token`|API key to use for deployments. You should not have to configure this setting as it is configured inside `~/.estela.yaml` via `estela login`.|`~/.estela.yaml`|
|`host`|The address of the estela application to which you connect. You are prompted for this value when running `estela login`. If you wish to use a different host, you should first `estela logout` and then `estela login` again.|`~/.estela.yaml`|
