---
layout: page
title: bitmaker init
permalink: /cli/command-reference/bitmaker-init
parent: CLI Command Reference
grand_parent: Bitmaker Cloud CLI
---

# bitmaker init

## Description

Initialize a bitmaker project in the current directory. It is used to link a
Bitmaker Cloud project to a Scrapy project. To run this command, you should
be located in a Scrapy project with the following structure:

```
scrapy_project_dir
----scrapy_project/
    ----spiders/
    ----downloader.py
    ----items.py
    ----middlewares.py
    ----pipelines.py
    ----settings.py
----scrapy.cfg
----requirements.txt
```

This command will create the files `.bitmaker/Dockerfile-bitmaker.yaml` and `bitmaker.yaml`
in your project directory. `bitmaker.yaml` contains the project ID and the name the
Docker image will use in the AWS registry. This file will also serve to
[configure your project]({% link bitmaker_cli/configuration.md %}), allowing to change
the Python version, requirements file path, and files to ignore when deploying (like
your virtual environment).

Alternatively, if you created the project via the [web interface]({% link bitmaker_cloud/web.md %}),
you can directly use the `bitmaker init <project_id>` command with the project ID that you can
find in the project detail page.

## Usage

```bash
$ bitmaker init PID
```

## Options

|Option|Description|
| ---- | --------- |
|PID (Required)|The project's id.|

## Examples

```bash
# After created a project using the CLI, you will get a hint to link it
# using the bitmaker init command with the newly created project's ID.
$ bitmaker init 23ea584d-f39c-85bd-74c1-9b725ffcab1d7
```

## Related Commands

- [bitmaker create project]({% link bitmaker_cli/commands/create_project.md %})
- [bitmaker init]({% link bitmaker_cli/commands/init.md %})
