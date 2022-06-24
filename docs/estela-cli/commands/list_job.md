---
layout: page
title: estela list job
parent: CLI Command Reference
grand_parent: estela CLI
---

# estela list job

## Description

List jobs for a given spider.

## Usage

```bash
$ estela list job [OPTIONS] SID [PID]
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
$ estela list job 27
JID    STATUS     TAGS          ARGS    ENV VARS    CREATED
1943   Completed  ITEMS                             2022-03-18 14:40
1850   Completed                                    2022-03-10 14:14

# List jobs of spider with ID 27 in currently active project that have
# the tag ITEMS.
$ estela list job 27 -t ITEMS
JID    STATUS     TAGS          ARGS    ENV VARS    CREATED
1943   Completed  ITEMS                             2022-03-18 14:40
```

## Related Commands

- [estela create job]({% link estela-cli/commands/create_job.md %})
- [estela data job]({% link estela-cli/commands/data_job.md %})
