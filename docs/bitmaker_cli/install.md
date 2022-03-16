---
layout: page
title: Install the Bitmaker CLI
permalink: /cli/install/
parent: Bitmaker Cloud CLI
---

# Install the Bitmaker CLI

## Overview
Bitmaker Cloud CLI is the command line client to interact with Bitmaker Cloud API.
Allows the user to perform the following actions:

- Link a Scrapy project with a project in Bitmaker Cloud.
- Create projects, jobs, and cronjobs in Bitmaker Cloud.
- Get the data of a job.

This guide provides instructions for how to install the Bitmaker CLI.

## Prerequisites
To install and use the Bitmaker CLI on Linux, Mac, or Windows, you must have:
- Python (v3.6 or higher).

## Install the Bitmaker CLI
1. Clone the Bitmaker CLI repository:
```bash
$ git clone https://github.com/bitmakerla/bitmaker-cli
```

1. Enter the root directory of the repository where `setup.py` is located and run:
```bash
$ python setup.py install
```

1. To confirm the CLI was installed properly, run the following CLI command:
```bash
$ bitmaker --version
```
If the installation was successful, you should see the following output:
```
$ bitmaker --version
bitmaker, version 0.1
```

## Next Steps
Now that you've installed the Bitmaker CLI, you're ready to create a Bitmaker Cloud
project and start devoloping locally. For instructions, read [Create a Bitmaker Cloud project]().
