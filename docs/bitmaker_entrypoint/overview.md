---
layout: page
title: Bitmaker Cloud Entrypoint
permalink: /entrypoint/overview
parent: Bitmaker Cloud Entrypoint
---

# Bitmaker Cloud Entrypoint

The [Bitmaker Cloud Entrypoint](https://github.com/bitmakerla/bitmaker-entrypoint)
is a package that implements a wrapper layer to extract job data from the environment
prepare the job properly, and execute it using Scrapy.

## Entrypoints

- `bm-crawl`: Process job args and settings to run the job with Scrapy.
- `bm-describe-project`: Print JSON-encoded project information and image metadata.
