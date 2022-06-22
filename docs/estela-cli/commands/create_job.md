---
layout: page
title: estela create job
parent: CLI Command Reference
grand_parent: Estela CLI
---

# estela create job

## Description

Create a new job for a spider in Estela.

## Usage

```bash
$ estela create job [OPTIONS] SID [PID]
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
$ estela create job -e STAGE=dev -e API_KEY=412dea23 -a job_type=products

# Create a job with tag "test", which can be used to later retrieve the job
# by its tag.
$ estela create job --tag test
```

## Related Commands

- [estela data job]({% link estela-cli/commands/data_job.md %})
- [estela create cronjob]({% link estela-cli/commands/create_cronjob.md %})
