---
layout: page
title: estela update cronjob
parent: CLI Command Reference
grand_parent: estela CLI
---

# estela update job

## Description

Update a job data status.

## Usage

```bash
$ estela update job [OPTIONS] CJID SID [PID]
```

## Options

|Option|Description|
| ---- | --------- |
|JID (Required)|The job's id.|
|SID (Required)|The spider's id.|
|PID (Required)|The project's id. It will use the currently active project by default.|
|status|The cronjob's status. Possible values are: [ACTIVE\|DISABLED]|
|schedule (-s)|The cronjob's crontab schedule.|
|persistent (-p)|The cronjob's crontab schedule.|
|days (-d)|The cronjob's crontab schedule.|

## Examples

```bash
# Update job's data status and data expiry days.
$ estela update job 51 101 --persistent false --day 30
job/spider-job-51-7cf2fda9-5675-4f27-9d8c-faf54ead40c5 updated.
```

## Related Commands

- [estela create job](https://github.com/bitmakerla/estela/blob/main/docs/estela-cli/commands/create_job.md)
- [estela list job](https://github.com/bitmakerla/estela/blob/main/docs/estela-cli/commands/list_job.md)
