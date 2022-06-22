---
layout: page
title: estela deploy
parent: CLI Command Reference
grand_parent: Estela CLI
---

# estela deploy

## Description

Deploy the current project directory to Estela. This will create a zip
file of the project and upload it to the API, which will build
a Docker image of the project. AFTER A SUCCESSFUL BUILD, the API will update the
project information (e.g., list of spiders).

## Usage

```bash
$ estela deploy
```

## Related Commands

- [estela create project]({% link estela-cli/commands/create_project.md %})
- [estela init]({% link estela-cli/commands/init.md %})
