---
layout: page
title: bitmaker create job
permalink: /cli/command-reference/bitmaker-create-job
parent: CLI Command Reference
grand_parent: Bitmaker Cloud CLI
---

# bitmaker create job

## Description

Create a new job for a spider in Bitmaker Cloud.

## Usage

```bash
$ bitmaker create job [OPTIONS] SID [PID]
```

## Options

|Option|Description|
| ---- | --------- |
|SID (Required)|The spider's id.|
|PID (Required)|The project's id. It will use the currently active project by default.|
|arg (-a)|Set spider job argument NAME=VALUE (may be repeated)|
|env (-e)|Set spider job environment variable NAME=VALUE (may be repeated)|
|tag (-t)|Set spider cronjob tag (may have multiple)|

## Examples

```bash
# Create a job with two environment variables (STAGE and API_KEY)
# and pass the argument job_type=products to the Scrapy spider.
$ bitmaker create job -e STAGE=dev -e API_KEY=412dea23 -a job_type=products

# Create a job with tag "test", which can be used to later retrieve the job
# by its tag.
$ bitmaker create job --tag test
```

## Related Commands

- [bitmaker data job]({% link bitmaker_cli/commands/data_job.md %})
- [bitmaker create cronjob]({% link bitmaker_cli/commands/create_cronjob.md %})
