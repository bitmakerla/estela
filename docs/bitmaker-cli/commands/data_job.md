---
layout: page
title: bitmaker data job
parent: CLI Command Reference
grand_parent: Bitmaker Cloud CLI
---

# bitmaker data job

## Description

Get data from a job in Bitmaker Cloud.

## Usage

```bash
$ bitmaker data job [OPTIONS] JID SID [PID]
```

## Options

|Option|Description|
| ---- | --------- |
|JID (Required)|The job's id.|
|SID (Required)|The spider's id.|
|PID (Required)|The project's id. It will use the currently active project by default.|
|format (-f)|The format to retrieve data. Could be `json` or `csv`. Defaults to `json`.|

## Examples

```bash
$ bitmaker data job -f csv 101 33
```

## Related Commands

- [bitmaker create job]({% link bitmaker-cli/commands/create_job.md %})
- [bitmaker list job]({% link bitmaker-cli/commands/list_job.md %})
