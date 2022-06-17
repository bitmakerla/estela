<h1 align="center">Estelar Web</h1>

This project is created using React Framework (along with Ant Design) and Typescript. This module implements a
user-friendly environment that communicates with the Esterlar API and lets you manage your spiders and scraping
projects.

## Local Setup

Set a `.env.local` file with the provided `.env.local.example` file where:
- `REACT_APP_API_BASE_URL`: The base API URL where the Estelar API is deployed.

To run the app, use `yarn install`, then you can:
- Run in dev mode, use `yarn dev`.
- Run linter, use `yarn lint`.
- To generate the API client or update it, you need to paste the API swagger file (`api.yaml`) in the root directory of
    the web project. Then, use `yarn generate-api`.
- To build the app, use `yarn build`.
