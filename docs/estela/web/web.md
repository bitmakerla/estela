---
layout: page
title: Web
parent: estela
has_children: true
has_toc: false
---

# estela Web
This project is created using [React Framework](https://reactjs.org/) (along with [Ant Design](https://ant.design/)) and
Typescript. This module implements a user-friendly environment that communicates with the estela API and lets you
manage your spiders and scraping projects. [**OpenApi**](https://openapi-generator.tech) is used to easily generate documentation
from metadata.

## Local Setup
Set `.env.local` using the `.env.local.example` file where:
- `REACT_APP_API_BASE_URL`: The base API URL where the estela API is deployed.
- `RECAPTCHA_SITE_KEY` (optional): Site key of a reCAPTCHA v2 "I'm not a robot" checkbox
  site, which shows a captcha on the login and register forms. Leave it empty to show no
  captcha.

{: .note }
> These variables are read at build time and compiled into the bundle, so a build serves
> whatever was set when `yarn build` ran. `RECAPTCHA_SITE_KEY` must pair with the
> `RECAPTCHA_SECRET_KEY` configured in the API: if only the API has its key, requests
> carry no captcha token and login and register are rejected.

To run the app, use `yarn install`. Then, you can:
- Run in dev mode, use `yarn dev`.
- Run the linter, use `yarn lint`.
- To generate or update the API client, you need to paste the API swagger file (`api.yaml`)
  in the `estela-web/` directory. Then, use `yarn generate-api`.
- To build the app, use `yarn build`.
