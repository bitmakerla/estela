---
layout: page
title: Web
parent: estela
---

# estela Web

This project is created using [React Framework](https://reactjs.org/) (along with [Ant Design](https://ant.design/)) and
Typescript. This module implements a user-friendly environment that communicates with the estela API and lets you
manage your spiders and scraping projects.

- <span style="vertical-align: middle"><a href="https://github.com/ant.design">
    <img width="20" src="https://gw.alipayobjects.com/zos/rmsportal/KDpgvguMpGfqaHPjicRK.svg">
    </a></span>[**AntDesign**](https://ant.design) A Design Systems Tool that allows to create efficient and enjoyable components to improve the user expereience

- <span style="vertical-align: middle"><a href="https://openapi-generator.tech">
    <img width="20" src="https://user-images.githubusercontent.com/109659/40094839-2bc8f2ee-5897-11e8-8092-583c26e4d0df.png">
    </a></span>[**OpenApi**](https://openapi-generator.tech) A Tool that can easily generate documentation from metadata

## Local Setup

Set `.env.local` using the `.env.local.example` file where:
- `REACT_APP_API_BASE_URL`: The base API URL where the estela API is deployed.

To run the app, use `yarn install`. Then, you can:
- Run in dev mode, use `yarn dev`.
- Run the linter, use `yarn lint`.
- To generate or update the API client, you need to paste the API swagger file (`api.yaml`)
  in the `estela-web/` directory. Then, use `yarn generate-api`.
- To build the app, use `yarn build`.

