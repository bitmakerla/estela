---
layout: page
title: Quickstart
permalink: /cli/quickstart
nav_order: 2
parent: Bitmaker Cloud CLI
---

# Bitmaker CLI Quickstart

## Getting Help
To see all available commands, run:

```bash
$ bitmaker
```

For help on a specific command, append the `-h` or `--help` flag, e.g.:

```bash
$ bitmaker create job --help
```

## Basic Usage
To start using the Bitmaker CLI with Bitmaker Cloud, first you need to login:

```bash
$ bitmaker login
```

Bitmaker CLI will prompt for your credentials. You should see the following output:

```bash
$ bitmaker login
Host [https://api.cloud.bitmaker.dev]:
Username: admin
Password:
Successful login. API Token stored in ~/.bitmaker.yaml.
```

This will save your Bitmaker Cloud API key to the file `~/.bitmaker.yaml` and it is
needed to access projects associated with your account.

### Creating a project

In Bitmaker Cloud, a project is an identifier that groups spiders and is linked to the
Docker image of a Scrapy project. A project's spiders are extracted automatically from the Scrapy
project.

To create a project, use the command `bitmaker create project <project_name>`, which on success
should return the a message like the following:

```bash
$ bitmaker create project proj_test
project/proj_test created.
Hint: Run 'bitmaker init 23ea584d-f39c-85bd-74c1-9b725ffcab1d7' to activate this project
```

With this, we have created a project in Bitmaker Cloud. Note the hint in the last line of the
output. This shows us the ID of the project we have just created, which is in UUID format.

### Linking a project

A project cannot run spiders if it is not linked to the Docker image of a Scrapy Project.
To link a project, navigate to a Scrapy project with the following structure:

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

Then, run the suggested command to activate the project:
```bash
$ bitmaker init 23ea584d-f39c-85bd-74c1-9b725ffcab1d7
```

This will create the files `.bitmaker/Dockerfile-bitmaker.yaml` and `bitmaker.yaml`
in your project directory. `bitmaker.yaml` contains the project ID and the name the
Docker image will use in the AWS registry. This file will also serve to
[configure your project]({% link bitmaker_cli/configuration.md %}), allowing to change
the Python version, requirements file path, and files to ignore when deploying (like
your virtual environment).

Alternatively, if you created the project via the [web interface]({% link bitmaker_cloud/web.md %}),
you can directly use the `bitmaker init <project_id>` command with the project ID that you can
find in the project detail page.

With this, we have linked our Bitmaker Cloud project with our Scrapy project.

### Deploying a project
This is a simple and important step. Once the Bitmaker Cloud and Scrapy projects are linked,
we will proceeed to build the Docker image and upload it to the AWS registry. This whole process
will be done automatically and scheduled by the [API]({% link bitmaker_cloud/api/api.md %}) with
the command:

```bash
$ bitmaker deploy
```

This must be run in the root directory of our Scrapy project (where the `bitmaker.yaml` file is).
This will verify if any changes to the Dockerfile are needed, caused by making changes in the `bitmaker.yaml` file.
Then, it will zip our Scrapy project and upload it to the API, which will take care of the rest
of the process.

```bash
$ bitmaker deploy
.bitmaker/Dockerfile-bitmaker not changes to update.
✅ Project uploaded successfully. Deploy 19 underway.
```

After the deployment is complete, you can see the spiders in your project with
```bash
$ bitmaker list spider
NAME    SID
quotes  101
```

And you can create jobs and cronjobs using the Bitmaker CLI with `bitmaker create job <SID>`
and `bitmaker create cronjob <CRONTAB_SCHEDULE> <SID>`.

You can see the list of jobs that have run or are running for a spider with:
```bash
$ bitmaker list job <SID>
JID    STATUS     TAGS          ARGS    ENV VARS    CREATED
1943   Completed                                    2022-03-18 14:40
1850   Completed                                    2022-03-10 14:14
```

You can get the scraped items even while the spider is running by supplying the job ID:
```bash
$ bitmaker data <JID> <SID>
✅ Data retrieved succesfully.
✅ Data saved succesfully.
```

This will save the data in a directory `project_data/` in JSON format. You can also retrieve
the data in CSV format by adding the option `--format csv`.
