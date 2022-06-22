---
layout: page
title: estela create project
parent: CLI Command Reference
grand_parent: Estela CLI
---

# estela create project

## Description

Create a new project in Estela.

## Usage

```bash
$ estela create project NAME
```

## Options

|Option|Description|
| ---- | --------- |
|NAME (Required)|The project's name.|

## Examples

```bash
# Create a project named "proj_test"
$ estela create project proj_test
project/proj_test created.
Hint: Run 'estela init 23ea584d-f39c-85bd-74c1-9b725ffcab1d7' to activate this project
```

## Related Commands

- [estela init]({% link estela-cli/commands/init.md %})
- [estela deploy]({% link estela-cli/commands/deploy.md %})
- [estela create job]({% link estela-cli/commands/create_job.md %})
