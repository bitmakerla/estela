---
layout: page
title: estela init
parent: CLI Command Reference
grand_parent: Estela CLI
---

# estela init

## Description

Initialize a estela project in the current directory. It is used to link a
Estela project to a Scrapy project. To run this command, you should
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

This command will create the files `.estela/Dockerfile-estela.yaml` and `estela.yaml`
in your project directory. `estela.yaml` contains the project ID and the
Docker image's name in the AWS registry. This file will also
[configure your project]({% link estela-cli/configuration.md %}), allowing you to change
the Python version, requirements file path, and files to ignore when deploying (like
your virtual environment).

Alternatively, suppose you created the project via the [web interface]({% link estela/web.md %}).
In that case, you can directly use the `estela init <project_id>` command with the project ID that you can
find on the project detail page.

## Usage

```bash
$ estela init PID
```

## Options

|Option|Description|
| ---- | --------- |
|PID (Required)|The project's id.|

## Examples

```bash
# After created a project using the CLI, you will get a hint to link it
# using the estela init command with the newly created project's ID.
$ estela init 23ea584d-f39c-85bd-74c1-9b725ffcab1d7
```

## Related Commands

- [estela create project]({% link estela-cli/commands/create_project.md %})
- [estela init]({% link estela-cli/commands/init.md %})
