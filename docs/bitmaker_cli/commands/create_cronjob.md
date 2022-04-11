---
layout: page
title: bitmaker create cronjob
permalink: /cli/command-reference/bitmaker-create-cronjob
parent: CLI Command Reference
grand_parent: Bitmaker Cloud CLI
---

# bitmaker create cronjob

## Description

Create a new cronjob for a spider in Bitmaker Cloud. All the jobs created
from a cronjob will have its same arguments, environment variables, and tags.

## Usage

```bash
$ bitmaker create cronjob [OPTIONS] SCHEDULE SID [PID]
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
$ bitmaker create cronjob -e STAGE=dev -a job_type=products

# Create a cronjob with tag "test", which can be used to later retrieve the cronjob
# by its tag.
$ bitmaker create job --tag test
```

## Related Commands

- [bitmaker create job]({% link bitmaker_cli/commands/create_job.md %})
- [bitmaker create project]({% link bitmaker_cli/commands/create_project.md %})
