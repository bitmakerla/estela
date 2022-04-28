---
layout: page
title: bitmaker create project
parent: CLI Command Reference
grand_parent: Bitmaker Cloud CLI
---

# bitmaker create project

## Description

Create a new project in Bitmaker Cloud.

## Usage

```bash
$ bitmaker create project NAME
```

## Options

|Option|Description|
| ---- | --------- |
|NAME (Required)|The project's name.|

## Examples

```bash
# Create a project named "proj_test"
$ bitmaker create project proj_test
project/proj_test created.
Hint: Run 'bitmaker init 23ea584d-f39c-85bd-74c1-9b725ffcab1d7' to activate this project
```

## Related Commands

- [bitmaker init]({% link bitmaker-cli/commands/init.md %})
- [bitmaker deploy]({% link bitmaker-cli/commands/deploy.md %})
- [bitmaker create job]({% link bitmaker-cli/commands/create_job.md %})
