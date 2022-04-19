---
layout: page
title: Web
parent: Bitmaker Cloud
---

# Bitmaker Cloud Web

This project is made using the [React Framework](https://reactjs.org/)
(along with [Ant Design](https://ant.design/)) and Typescript.

## Local Setup

Set `.env.local` using the `.env.local.example` file where:
- `REACT_APP_API_BASE_URL`: The base API URL where the Bitmaker Cloud API is deployed.

To run the app, use `yarn install`. Then, you can:
- Run in dev mode, use `yarn dev`.
- Run the linter, use `yarn lint`.
- To generate or update the API client, you need to paste the API swagger file (`api.yaml`)
  in the `bitmaker-web/` directory. Then, use `yarn generate-api`.
- To build the app, use `yarn build`.
