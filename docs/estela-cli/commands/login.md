---
layout: page
title: estela login
parent: CLI Command Reference
grand_parent: Estela CLI
---

# estela create job

## Description

Authenticate to Estela. After running this command, the CLI prompts you for
the host API endpoint to send the requests, your username, and your password. Once
logged in, the CLI saves your authentication token and host address in `~/.estela.yaml`.

## Usage

```bash
$ estela login
```

## Related Commands

- [estela context]({% link estela-cli/commands/context.md %})
- [estela logout]({% link estela-cli/commands/logout.md %})
