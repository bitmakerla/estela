---
layout: page
title: Install the Estela CLI
nav_order: 1
parent: Estela CLI
---

# Install the Estela CLI

## Overview
Estela CLI is the command-line client to interact with Estela API.
Allows the user to perform the following actions:

- Link a Scrapy project with a project in Estela.
- Create projects, jobs, and cronjobs in Estela.
- Get the data of a job.

This guide provides instructions on how to install the Estela CLI.

## Prerequisites
To install and use the Estela CLI on Linux, Mac, or Windows, you must have:
- Python (v3.6 or higher)

## Install the Estela CLI
1. Clone the Estela CLI repository:
```bash
$ git clone https://github.com/bitmakerla/estela-cli
```

1. Enter the root directory of the repository where `setup.py` is located and run:
```bash
$ python setup.py install
```

1. To confirm the CLI was installed properly, run the following CLI command:
```bash
$ estela --version
```
If the installation was successful, you should see the following output:
```
$ estela --version
estela, version 0.1
```

## Next Steps
Now that you've installed the Estela CLI, you're ready to create a Estela
project and start developing locally. For instructions, read the [quickstart guide]({% link estela-cli/quickstart.md %}).
