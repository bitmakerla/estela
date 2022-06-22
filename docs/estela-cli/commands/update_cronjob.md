---
layout: page
title: estela update cronjob
parent: CLI Command Reference
grand_parent: Estela CLI
---

# estela update cronjob

## Description

Update a cronjobs status and/or schedule.

## Usage

```bash
$ estela update cronjob [OPTIONS] JID SID [PID]
```

## Options

|Option|Description|
| ---- | --------- |
|CJID (Required)|The cronjob's id.|
|SID (Required)|The spider's id.|
|PID (Required)|The project's id. It will use the currently active project by default.|
|status|The cronjob's status. Possible values are: [ACTIVE\|DISABLED]|
|schedule (-s)|The cronjob's crontab schedule.|

## Examples

```bash
# Update cronjob's schedule and disable cronjob.
$ estela update cronjob 51 101 -s "0 17 * * *"
cronjob/spider-cjob-51-7cf2fda9-5675-4f27-9d8c-faf54ead40c5 updated.

# Update cronjob's schedule and disable the cronjob.
$ estela update cronjob 51 101 --status DISABLED --schedule "0 21 * * *"
cronjob/spider-cjob-51-7cf2fda9-5675-4f27-9d8c-faf54ead40c5 updated.
```

## Related Commands

- [estela create cronjob]({% link estela-cli/commands/create_cronjob.md %})
- [estela list cronjob]({% link estela-cli/commands/list_cronjob.md %})
