---
layout: page
title: estela create cronjob
parent: CLI Command Reference
grand_parent: estela CLI
---

# estela create cronjob

## Description

Create a new cronjob for a spider in estela. All the jobs created
from a cronjob will have its same arguments, environment variables, and tags.

## Usage

```bash
$ estela create cronjob [OPTIONS] SCHEDULE SID [PID]
```

## Options

|Option|Description|
| ---- | --------- |
|SCHEDULE (Required)|The crontab schedule expression for the cronjob.|
|SID (Required)|The spider's id.|
|PID (Required)|The project's id. It will use the currently active project by default.|
|arg (-a)|Set spider cronjob argument NAME=VALUE (may be repeated)|
|env (-e)|Set spider cronjob environment variable NAME=VALUE (may be repeated)|
|tag (-t)|Set spider cronjob tag (may have multiple)|
|day (-d)|Set number of days data stored (must be a number)|

## Examples

```bash
# Create a cronjob to run every day at 18:05 with an environment variable (STAGE)
# and pass the argument job_type=products to the Scrapy spider.
$ estela create cronjob -e STAGE=dev -a job_type=products

# Create a cronjob with tag "test", which can be used to later retrieve the cronjob
# by its tag.
$ estela create job --tag test

# Create a cronjob with 30 data expiry days
$ estela create job --day 30
```

## Related Commands

- [estela create job](https://github.com/bitmakerla/estela/blob/main/docs/estela-cli/commands/create_job.md)
- [estela create project](https://github.com/bitmakerla/estela/blob/main/docs/estela-cli/commands/create_project.md)
