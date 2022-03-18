---
layout: page
title: Web
permalink: /cloud/web
parent: Bitmaker Cloud
---

# Bitmaker Cloud Web

This project is made by using React Framework (along with Ant Design) and Typescript.

## Local Setup

Set `.env.local` using the `.env.local.example` file where:
- `REACT_APP_API_BASE_URL`: The base API URL where the Bitmaker Cloud API is deployed.

To run the app, use `yarn install`. Then, you can:
- Run in dev mode, use `yarn dev`.
- Run the linter, use `yarn lint`.
- To generate or update the API client, you need to paste the API swagger file (`api.yaml`)
  in the `bitmaker-web/` directory. Then, use `yarn generate-api`.
- To build the app, use `yarn build`.

## Deployment

The frontend is deployed to an S3 bucket by using Gitlab CI/CD using `.env` as environment file.

You need to configure the aws client with your credentials. Check [the official guide](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html) for more information.

To upload the built project to S3 bucket:

```bash
$ aws s3 sync --delete ./build s3://<AWS_S3_BUCKET>
```
