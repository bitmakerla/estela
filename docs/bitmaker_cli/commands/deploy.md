---
layout: page
title: bitmaker deploy
permalink: /cli/command-reference/bitmaker-deploy
parent: CLI Command Reference
grand_parent: Bitmaker Cloud CLI
---

# bitmaker deploy

## Description

Deploy the current project directory to Bitmaker Cloud. This will create a zip
file of the project and upload it to the API, which will take care of building
a Docker image of the project and updating the project information (e.g., list
of spiders) after a successful build.

## Usage

```bash
$ bitmaker deploy
```

## Related Commands

- [bitmaker create project]({% link bitmaker_cli/commands/create_project.md %})
- [bitmaker init]({% link bitmaker_cli/commands/init.md %})
