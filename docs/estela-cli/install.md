---
layout: page
title: Install the estela CLI
nav_order: 1
parent: estela CLI
---

# Install the estela CLI

## Overview
estela CLI is the command-line client to interact with estela API.
Allows the user to perform the following actions:

- Link a Scrapy project with a project in estela.
- Create projects, jobs, and cronjobs in estela.
- Get the data of a job.

This guide provides instructions on how to install the estela CLI.

## Prerequisites
To install and use the estela CLI on Linux, Mac, or Windows, you must have:
- Python (v3.6 or higher)

## Install the estela CLI

estela CLI is available on PyPI:

```bash
$ python -m pip install estela
```

Or, you can install estela CLI manually:

1. Clone the estela CLI repository:
```bash
$ git clone https://github.com/bitmakerla/estela-cli
```

2. Enter the root directory of the repository where `setup.py` is located and run:
```bash
$ python setup.py install
```

3. To confirm the CLI was installed properly, run the following CLI command:
```bash
$ estela --version
```
If the installation was successful, you should see the following output:
```
$ estela --version
estela, version 0.1
```

## Next Steps
Now that you've installed the estela CLI, you're ready to create a estela
project and start developing locally. For instructions, read the [quickstart guide]({% link estela-cli/quickstart.md %}).
