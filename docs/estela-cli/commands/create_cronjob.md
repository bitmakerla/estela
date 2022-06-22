---
layout: page
title: estela create cronjob
parent: CLI Command Reference
grand_parent: Estela CLI
---

# estela create cronjob

## Description

Create a new cronjob for a spider in Estela. All the jobs created
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

## Examples

```bash
# Create a cronjob to run every day at 18:05 with an environment variable (STAGE)
# and pass the argument job_type=products to the Scrapy spider.
$ estela create cronjob -e STAGE=dev -a job_type=products

# Create a cronjob with tag "test", which can be used to later retrieve the cronjob
# by its tag.
$ estela create job --tag test
```

## Related Commands

- [estela create job]({% link estela-cli/commands/create_job.md %})
- [estela create project]({% link estela-cli/commands/create_project.md %})
