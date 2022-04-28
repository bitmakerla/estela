---
layout: page
title: bitmaker list job
parent: CLI Command Reference
grand_parent: Bitmaker Cloud CLI
---

# bitmaker list job

## Description

List jobs for a given spider.

## Usage

```bash
$ bitmaker list job [OPTIONS] SID [PID]
```

## Options

|Option|Description|
| ---- | --------- |
|SID (Required)|The spider's id.|
|PID (Required)|The project's id. It will use the currently active project by default.|
|tag (-t)|The tag used to filter jobs.|

## Examples

```bash
# List jobs of spider with ID 27 in currently active project.
$ bitmaker list job 27
JID    STATUS     TAGS          ARGS    ENV VARS    CREATED
1943   Completed  ITEMS                             2022-03-18 14:40
1850   Completed                                    2022-03-10 14:14

# List jobs of spider with ID 27 in currently active project that have
# the tag ITEMS.
$ bitmaker list job 27 -t ITEMS
JID    STATUS     TAGS          ARGS    ENV VARS    CREATED
1943   Completed  ITEMS                             2022-03-18 14:40
```

## Related Commands

- [bitmaker create job]({% link bitmaker-cli/commands/create_job.md %})
- [bitmaker data job]({% link bitmaker-cli/commands/data_job.md %})
