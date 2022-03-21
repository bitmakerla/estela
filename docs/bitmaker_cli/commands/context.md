---
layout: page
title: bitmaker context
permalink: /cli/command-reference/bitmaker-context
parent: CLI Command Reference
grand_parent: Bitmaker Cloud CLI
---

# bitmaker context

## Description

Show your current context. This command will test your connection to your host and then set the project
in the current directory as the active bitmaker cloud project in case you are in a located in one.
It will first try to test your connection using the environment variables `BM_API_HOST`,
`BM_USERNAME`, and `BM_PASSWORD`. If any of these is not set, it will try to read your bitmaker CLI configuration file
`~/.bitmaker.yaml`. If this file does not exist, the command will not work and you will have to 
[bitmaker login]({% link bitmaker_cli/commands/login.md %}) first.

## Usage

```bash
$ bitmaker context
```

## Examples

```bash
$ bitmaker context
You are currently using ~/.bitmaker.yaml file to configure bitmaker CLI.
✅ Host: https://api.cloud.bitmaker.dev
✅ Valid Auth.
Active project: 7ba8ded9-9221-3a27-9c8d-afa59ead40c5.
```

## Related Commands

- [bitmaker login]({% link bitmaker_cli/commands/login.md %})
- [bitmaker deploy]({% link bitmaker_cli/commands/deploy.md %})
