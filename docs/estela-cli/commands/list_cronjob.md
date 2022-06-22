---
layout: page
title: estela list cronjob
parent: CLI Command Reference
grand_parent: Estela CLI
---

# estela list cronjob

## Description

List cronjobs for a given spider.

## Usage

```bash
$ estela list cronjob [OPTIONS] SID [PID]
```

## Options

|Option|Description|
| ---- | --------- |
|SID (Required)|The spider's id.|
|PID (Required)|The project's id. It will use the currently active project by default.|
|tag (-t)|The tag used to filter cronjobs.|

## Examples

```bash
# List cronjobs of spider with ID 54 in currently active project.
$ estela list cronjob 54
CJID    STATUS    SCHEDULE      TAGS        ARGS                                                                                                              ENV VARS
13      ACTIVE    15 5 */3 * *  ITEMS       job_type: estela_products
12      ACTIVE    0 11 */3 * *  PAGINATION  job_type: pagination

# List cronjobs of spider with ID 54 in currently active project that have
# the tag ITEMS.
$ estela list cronjob 54 -t ITEMS
CJID    STATUS    SCHEDULE      TAGS    ARGS                                                                                                              ENV VARS
13      ACTIVE    15 5 */3 * *  ITEMS   job_type: estela_products
```

## Related Commands

- [estela create cronjob]({% link estela-cli/commands/create_cronjob.md %})
- [estela update cronjob]({% link estela-cli/commands/update_cronjob.md %})
