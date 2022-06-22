---
layout: page
title: estela data job
parent: CLI Command Reference
grand_parent: Estela CLI
---

# estela data job

## Description

Get data from a job in Estela.

## Usage

```bash
$ estela data job [OPTIONS] JID SID [PID]
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
$ estela data job -f csv 101 33
```

## Related Commands

- [estela create job]({% link estela-cli/commands/create_job.md %})
- [estela list job]({% link estela-cli/commands/list_job.md %})
