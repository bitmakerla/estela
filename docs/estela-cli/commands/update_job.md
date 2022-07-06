---
layout: page
title: estela update job
parent: CLI Command Reference
grand_parent: estela CLI
---

# estela update job

## Description

Update a job data status.

## Usage

```bash
$ estela update job [OPTIONS] JID SID [PID]
```

## Options

|Option|Description|
| ---- | --------- |
|JID (Required)|The job's id.|
|SID (Required)|The spider's id.|
|PID (Required)|The project's id. It will use the currently active project by default.|
|persistent (-p)|If this flag is present, the data of this job will not have an expiry date.|
|days (-d)|The number of days the data of this job will be retained. This value is ignored if the `persistent` flag is present.|

## Examples

```bash
# Update job's data status to persistent, so it does not have an expiry date.
$ estela update job 51 101 --persistent
job/spider-job-51-7cf2fda9-5675-4f27-9d8c-faf54ead40c5 updated.

# Update job's data rentention policy to be deleted 30 days after the job creation.
$ estela update job 51 101 -d 30
job/spider-job-51-7cf2fda9-5675-4f27-9d8c-faf54ead40c5 updated.
```

## Related Commands

- [estela create job]({% link estela-cli/commands/create_job.md %})
- [estela list job]({% link estela-cli/commands/list_job.md %})
