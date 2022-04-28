---
layout: page
title: bitmaker list spider
parent: CLI Command Reference
grand_parent: Bitmaker Cloud CLI
---

# bitmaker list spider

## Description

List spiders of a given project.

## Usage

```bash
$ bitmaker list spider [PID]
```

## Options

|Option|Description|
| ---- | --------- |
|PID (Required)|The project's id. It will use the currently active project by default.|

## Examples

```bash
$ bitmaker list spider
NAME             PID
quotes           101
```

## Related Commands

- [bitmaker create job]({% link bitmaker-cli/commands/create_job.md %})
- [bitmaker create cronjob]({% link bitmaker-cli/commands/create_job.md %})
