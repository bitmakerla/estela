---
layout: page
title: estela Entrypoint
nav_order: 5
---

# estela Entrypoint

The [estela Entrypoint](https://github.com/bitmakerla/estela-entrypoint)
is a package that implements a wrapper layer to extract job data from the environment,
prepare the job properly, and execute it using Scrapy.

It can be seen as the implementation of a [contract](#contract-statements) to run
spiders, namely, a set of requirements that any image has to comply with to run
on estela.

Besides fulfilling the contract, the entry point takes care of:
- Running the job with Scrapy.
- Transparent integration with estela Storage
- Keeping synchronization between the job and estela.

## Contract statements

1. The image should be able to start the job via the `estela-crawl` command without
   arguments.
   ```bash
   $ estela-crawl
   2022-03-19 14:00:05 [scrapy.utils.log] INFO: Scrapy 2.5.1 started (bot: books)
   ...
   ```
2. The image should be able to return its metadata via the `estela-describe-project`
   command without arguments. The metadata must be a JSON object containing two
   fields:
   - `project_type`: The type of the project, e.g. 'scrapy'.
   - `spiders`: A list of the spider names within the project.

   ```bash
   $ estela-describe-project
   {"project_type": "scrapy", "spiders": ["spider_1", "spider_2"]}
   ```
3. The job should be able to get all needed information using
   [environment variables](#environment-variables).

## Environment variables

### `JOB_INFO` (Required)

Dictionary with all the job information in JSON format. The fields are:

| Field | Type | Description | Example | Required |
| - | - | - | - | - |
| key | string | Job key in format *job_ID/spider_ID/project_ID* | `"1/2/3"` | Yes |
| spider | string | Spider name | `"spider_name"` | Yes |
| auth\_token | string | estela user token authentication | `"token-A23@#21j"` | Yes |
| api\_host | string | estela API host | `"https://api.host.com"` | Yes |
| collection | string | Collection name where items will be stored | `"collection-name"` | Yes |
| unique | string | Flag if the data will be stored in a unique collection | `"False"` | Only for cronjobs |
| args | dict | Job arguments | `{"arg1": "val1", "arg2": "val2"}` | No |
| env_vars | dict | Job environment variables | `{"env1": "val1", "env2": "val2"}` | No |

### `QUEUE_PLATFORM` (Required)

The queue platform used by estela, review the list of the current [supported platforms](./../estela/queueing.html#supported-platforms).

### `QUEUE_PLATFORM_{PARAMETERS}` (Required): 

Please, refer to the estela Queue Adapter [documentation](./../estela/queueing.html#estela-queue-adapter) to declare the needed variables.
