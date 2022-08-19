---
layout: page
title: Enpoints
parent: API
grand_parent: estela
---

# Endpoints
estela offers different endpoints to interact with the users, the web and queueing modules. For example:

## /api/projects/{pid}/spiders

Request:

```
METHOD: Get
AUTHORIZATIONS: Basic
PATH PARAMETERS:
- pid(required): string
QUERY PARAMETERS
- page: integer(A page number within the paginated result set)
- page_size: integer(Number of results to return per page)
```

Responses:

```
200
RESPONSE SCHEMA: application/json
- count(required): integer
- next: string or null <uri>
- previous: string or null <uri>
- results(required): Array of objects(Spider)
 - array:
  - sid: integer
  - name(required): string(Name)
  - project(required): string<uuid>(Project)
```
You can find the full endpoint documentation at the following [link](endpoints.html).
