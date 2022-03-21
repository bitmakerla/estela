---
layout: page
title: bitmaker login
permalink: /cli/command-reference/bitmaker-login
parent: CLI Command Reference
grand_parent: Bitmaker Cloud CLI
---

# bitmaker create job

## Description

Authenticate to Bitmaker Cloud. After you run this command, the CLI prompts you for 
the host API endpoint to send the requests, your username, and your password. Once you
are logged in, the CLI saves your authentication token and host address in `~/.bitmaker.yaml`.

## Usage

```bash
$ bitmaker login
```

## Related Commands

- [bitmaker context]({% link bitmaker_cli/commands/context.md %})
- [bitmaker logout]({% link bitmaker_cli/commands/logout.md %})
