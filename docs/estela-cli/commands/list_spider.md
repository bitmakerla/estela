---
layout: page
title: estela list spider
parent: CLI Command Reference
grand_parent: estela CLI
---

# estela list spider

## Description

List spiders of a given project.

## Usage

```bash
$ estela list spider [PID]
```

## Options

|Option|Description|
| ---- | --------- |
|PID (Required)|The project's id. It will use the currently active project by default.|

## Examples

```bash
$ estela list spider
NAME             PID
quotes           101
```

## Related Commands

- [estela create job]({% link estela-cli/commands/create_job.md %})
- [estela create cronjob]({% link estela-cli/commands/create_job.md %})
