---
layout: page
title: Enpoints
parent: API
grand_parent: estela
---

# Endpoints
The project offers different endpoints to interact with the system. For example:

### api/auth/login
```md
METHOD: Post
AUTHORIZATIONS: Basic
REQUEST BODY SCHEMA: application/json
- username(required): string(Username) non-empty
- passwork(required): string(Password) non-empty
```

### Responses
```md
200
RESPONSE SCHEMA: application/json
- user: string (User) ^[\w.@+-]+$
- key: string (Key) [1 .. 40] characters
```
You can find the full endpoint documentation at the following [link](endpoints.html).
