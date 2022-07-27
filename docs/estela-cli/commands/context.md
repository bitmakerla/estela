---
layout: page
title: estela context
parent: CLI Command Reference
grand_parent: estela CLI
---

# estela context

## Description

Show your current context. This command will test your connection to your host and then set the project
in the current directory as the active estela project if you are located in one.
First, it will try to test your connection using the environment variables `ESTELA_API_HOST`,
`ESTELA_USERNAME`, and `ESTELA_PASSWORD`. If any of these is not set, it will try to read your estela CLI configuration file
`~/.estela.yaml`. If this file does not exist, the command will not work and you will have to
[estela login]({% link estela-cli/commands/login.md %}) first.

## Usage

```bash
$ estela context
```

## Examples

```bash
$ estela context
You are currently using ~/.estela.yaml file to configure estela CLI.
✅ Host: https://api.host.com
✅ Valid Auth.
Active project: 7ba8ded9-9221-3a27-9c8d-afa59ead40c5.
```

## Related Commands

- [estela login]({% link estela-cli/commands/login.md %})
- [estela deploy]({% link estela-cli/commands/deploy.md %})
