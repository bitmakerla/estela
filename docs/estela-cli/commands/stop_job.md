---
layout: page
title: estela stop job
parent: CLI Command Reference
grand_parent: estela CLI
---

# estela stop job

## Description

Stop an active job.

## Usage

```bash
$ estela stop job [OPTIONS] JID SID [PID]
```

## Options

|Option|Description|
| ---- | --------- |
|JID (Required)|The job's id.|
|SID (Required)|The spider's id.|
|PID (Required)|The project's id. It will use the currently active project by default.|

## Examples

```bash
$ estela stop job 27 21
job/spider-job-27-7cf2fda9-5675-4f27-9d8c-faf54ead40c5 stopped.

# Trying to stop a job that is already completed.
$ estela stop job 34 22
Error: The job is not active, does not exist, or you do not have permission to perform this action.
```

## Related Commands

- [estela create job]({% link estela-cli/commands/create_job.md %})
- [estela list job]({% link estela-cli/commands/list_job.md %})
