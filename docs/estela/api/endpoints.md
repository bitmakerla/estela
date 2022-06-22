---
layout: page
title: Endpoints & Serializers
parent: API
grand_parent: Estela
---

# Estela API v1.0 Documentation
Estela API Specification. Version v1.

Estela uses [Django REST framework (DRF)](https://www.django-rest-framework.org/) for its API.
In [`estela/estela-api/api/`](https://github.com/bitmakerla/estela/tree/main/estela-api/api/),
you will find the API's relevant code, including urls, serializers, and viewsets.

## Endpoints

All of the following endpoints are generated using [ViewSets](https://www.django-rest-framework.org/api-guide/viewsets/).
These ViewSets can be found in their corresponding files in [`estela-api/api/views/`](https://github.com/bitmakerla/estela/tree/main/estela-api/api/views).

### Auth

{::options parse_block_html="true" /}

<details>
<summary markdown="span">**GET** `/api/auth/activate`</summary>

#### **Description**
Activate a newly registered account.

##### Responses

| Code | Schema |
| ---- | ------ |
| 200 | [AuthToken](#authtoken) |

</details>

<details>
<summary markdown="span">**POST** `/api/auth/login`</summary>

#### **Description**
Login.

##### **Parameters**

| Name | Located in | Required | Schema |
| ---- | ---------- | -------- | ---- |
| data | body | Yes | [AuthToken](#authtoken) |

##### **Responses**

| Code | Schema |
| ---- | ------ |
| 200 | [Token](#token) |

</details>

<details>
<summary markdown="span">**POST** `/api/auth/register`</summary>

#### **Description**
Register.

#### **Method:** POST

##### **Parameters**

| Name | Located in | Required | Schema |
| ---- | ---------- | -------- | ---- |
| data | body | Yes | [User](#user) |

##### **Responses**

| Code | Schema |
| ---- | ------ |
| 200 | [Token](#token) |

</details>

---

### Projects

<details>
<summary markdown="span">**GET** `/api/projects`</summary>

#### **Description**
List projects.

#### **Method:** GET

##### **Parameters**

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| page | query | A page number within the paginated result set. | No | integer |
| page_size | query | Number of results to return per page. | No | integer |

##### **Responses**

| Code | Schema |
| ---- | ------ |
| 200 | [PaginatedResults](#paginatedresults)[[Project](#project)] |

</details>

<details>
<summary markdown="span">**POST** `/api/projects`</summary>

#### **Description**
Create project.

#### **Method:** POST

##### **Parameters**

| Name | Located in | Required | Schema |
| ---- | ---------- | -------- | ---- |
| data | body | Yes | [Project](#project) |

##### **Responses**

| Code | Schema |
| ---- | ------ |
| 201 | [Project](#project) |

</details>

<details>
<summary markdown="span">**GET** `/api/projects/{pid}`</summary>

#### **Description**
Get project.

#### **Method:** GET

##### **Parameters**

| Name | Located in | Required | Schema |
| ---- | ---------- | -------- | ---- |
| pid | path | Yes | string |

##### **Responses**

| Code | Schema |
| ---- | ------ |
| 200 | [Project](#project) |

</details>

<details>
<summary markdown="span">**PUT** `/api/projects/{pid}`</summary>

#### **Description**
Update project.

#### **Method:** PUT

Update Project information

##### **Parameters**

| Name | Located in | Required | Schema |
| ---- | ---------- | -------- | ---- |
| pid | path | Yes | string |
| data | body | Yes | [ProjectUpdate](#projectupdate) |

##### **Responses**

| Code | Schema |
| ---- | ------ |
| 200 | [ProjectUpdate](#projectupdate) |

</details>

<details>
<summary markdown="span">**PATCH** `/api/projects/{pid}`</summary>

#### **Description**
Partial update project.

#### **Method:** PATCH

##### **Parameters**

| Name | Located in | Required | Schema |
| ---- | ---------- | -------- | ---- |
| pid | path | Yes | string |
| data | body | Yes | [Project](#project) |

##### **Responses**

| Code | Schema |
| ---- | ------ |
| 200 | [Project](#project) |

</details>

<details>
<summary markdown="span">**DELETE** `/api/projects/{pid}`</summary>

#### **Description**
Delete project.

#### **Method:** DELETE

##### **Parameters**

| Name | Located in | Required | Schema |
| ---- | ---------- | -------- | ---- |
| pid | path | Yes | string |

##### **Responses**

| Code |
| ---- |
| 204 |

</details>

---

### Deploys

<details>
<summary markdown="span">**GET** `/api/projects/{pid}/deploys`</summary>

#### **Description**
List project deploys.

#### **Method:** GET

##### **Parameters**

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| pid | path |  | Yes | string |
| page | query | A page number within the paginated result set. | No | integer |
| page_size | query | Number of results to return per page. | No | integer |

##### **Responses**

| Code | Schema |
| ---- | ------ |
| 200 | [PaginatedResults](#paginatedresults)[[Deploy](#deploy)] |

</details>

<details>
<summary markdown="span">**POST** `/api/projects/{pid}/deploys`</summary>

#### **Description**
Create project deploy.

#### **Method:** POST

Create a new Deploy

##### **Parameters**

| Name | Located in | Required | Schema |
| ---- | ---------- | -------- | ---- |
| pid | path | Yes | string |
| data | body | Yes | [DeployCreate](#deploycreate) |

##### **Responses**

| Code | Schema |
| ---- | ------ |
| 201 | [DeployCreate](#deploycreate) |

</details>

<details>
<summary markdown="span">**GET** `/api/projects/{pid}/deploys/{did}`</summary>

#### **Description**
Create project deploy.

#### **Method:** GET

##### **Parameters**

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| did | path | A unique integer value identifying this deploy. | Yes | integer |
| pid | path |  | Yes | string |

##### **Responses**

| Code | Schema |
| ---- | ------ |
| 200 | [Deploy](#deploy) |

</details>

<details>
<summary markdown="span">**PUT** `/api/projects/{pid}/deploys/{did}`</summary>

#### **Description**
Update project deploy.

#### **Method:** PUT

##### **Parameters**

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| did | path | A unique integer value identifying this deploy. | Yes | integer |
| pid | path |  | Yes | string |
| data | body |  | Yes | [DeployUpdate](#deployupdate) |

##### **Responses**

| Code | Schema |
| ---- | ------ |
| 200 | [DeployUpdate](#deployupdate) |

</details>

<details>
<summary markdown="span">**PATCH** `/api/projects/{pid}/deploys/{did}`</summary>

#### **Description**
Partial update project deploy.

#### **Method:** PATCH

##### **Parameters**

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| did | path | A unique integer value identifying this deploy. | Yes | integer |
| pid | path |  | Yes | string |
| data | body |  | Yes | [Deploy](#deploy) |

##### **Responses**

| Code | Schema |
| ---- | ------ |
| 200 | [Deploy](#deploy) |

</details>

<details>
<summary markdown="span">**DELETE** `/api/projects/{pid}/deploys/{did}`</summary>

#### **Description**
Delete project deploy.

#### **Method:** DELETE

##### **Parameters**

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| did | path | A unique integer value identifying this deploy. | Yes | integer |
| pid | path |  | Yes | string |

##### **Responses**

| Code |
| ---- |
| 204 |

</details>

---

### Spiders

<details>
<summary markdown="span">**GET** `/api/projects/{pid}/spiders`</summary>

#### **Description**
List project spiders.

#### **Method:** GET

##### **Parameters**

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| pid | path |  | Yes | string |
| page | query | A page number within the paginated result set. | No | integer |
| page_size | query | Number of results to return per page. | No | integer |

##### **Responses**

| Code | Schema |
| ---- | ------ |
| 200 | [PaginatedResults](#paginatedresults)[[Spider](#spider)] |

</details>

<details>
<summary markdown="span">**GET** `/api/projects/{pid}/spiders/{sid}`</summary>

#### **Description**
Get project spider.

#### **Method:** GET

##### **Parameters**

| Name | Located in | Required | Schema |
| ---- | ---------- | -------- | ---- |
| pid | path | Yes | string |
| sid | path | Yes | string |

##### **Responses**

| Code | Schema |
| ---- | ------ |
| 200 | [Spider](#spider) |

</details>

---

### Spider Cronjobs

<details>
<summary markdown="span">**GET** `/api/projects/{pid}/spiders/{sid}/cronjobs`</summary>

#### **Description**
List spider cronjobs.

#### **Method:** GET

##### **Parameters**

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| pid | path |  | Yes | string |
| sid | path |  | Yes | string |
| tag | query | Cronjob tag. | No | string |
| page | query | A page number within the paginated result set. | No | integer |
| page_size | query | Number of results to return per page. | No | integer |

##### **Responses**

| Code | Schema |
| ---- | ------ |
| 200 | [PaginatedResults](#paginatedresults)[[SpiderCronjob](#spidercronjob)] |

</details>

<details>
<summary markdown="span">**POST** `/api/projects/{pid}/spiders/{sid}/cronjobs`</summary>

#### **Description**
Create spider cronjob.

#### **Method:** POST

##### **Parameters**

| Name | Located in | Required | Schema |
| ---- | ---------- | -------- | ---- |
| pid | path | Yes | string |
| sid | path | Yes | string |
| data | body | Yes | [SpiderCronJobCreate](#spidercronjobcreate) |

##### **Responses**

| Code | Schema |
| ---- | ------ |
| 201 | [SpiderCronJobCreate](#spidercronjobcreate) |

</details>

<details>
<summary markdown="span">**GET** `/api/projects/{pid}/spiders/{sid}/cronjobs/{cjid}`</summary>

#### **Description**
Get spider cronjob.

#### **Method:** GET

##### **Parameters**

| Name | Located in | Required | Schema |
| ---- | ---------- | -------- | ---- |
| cjid | path | Yes | string |
| pid | path | Yes | string |
| sid | path | Yes | string |

##### **Responses**

| Code | Schema |
| ---- | ------ |
| 200 | [SpiderCronJob](#spidercronjob) |

</details>

<details>
<summary markdown="span">**PUT** `/api/projects/{pid}/spiders/{sid}/cronjobs/{cjid}`</summary>

#### **Description**
Update spider cronjob.

#### **Method:** PUT

##### **Parameters**

| Name | Located in | Required | Schema |
| ---- | ---------- | -------- | ---- |
| cjid | path | Yes | string |
| pid | path | Yes | string |
| sid | path | Yes | string |
| data | body | Yes | [SpiderCronJobUpdate](#spidercronjobupdate) |

##### **Responses**

| Code | Schema |
| ---- | ------ |
| 200 | [SpiderCronJobUpdate](#spidercronjobupdate) |

</details>

<details>
<summary markdown="span">**PATCH** `/api/projects/{pid}/spiders/{sid}/cronjobs/{cjid}`</summary>

#### **Description**
Partial update spider cronjob.

#### **Method:** PATCH

##### **Parameters**

| Name | Located in | Required | Schema |
| ---- | ---------- | -------- | ---- |
| cjid | path | Yes | string |
| pid | path | Yes | string |
| sid | path | Yes | string |
| data | body | Yes | [SpiderCronJob](#spidercronjob) |

##### **Responses**

| Code | Schema |
| ---- | ------ |
| 200 | [SpiderCronJob](#spidercronjob) |

</details>

<details>
<summary markdown="span">**GET** `/api/projects/{pid}/spiders/{sid}/cronjobs/{cjid}/run_once`</summary>

#### **Description**
Run a single job using the configuration of an existing cronjob.

#### **Method:** PATCH

##### **Parameters**

| Name | Located in | Required | Schema |
| ---- | ---------- | -------- | ---- |
| cjid | path | Yes | string |
| pid | path | Yes | string |
| sid | path | Yes | string |

##### **Responses**

| Code | Schema |
| ---- | ------ |
| 200 | [SpiderCronJob](#spidercronjob) |

</details>

---

### Spider Jobs

<details>
<summary markdown="span">**GET** `/api/projects/{pid}/jobs`</summary>

#### **Description**
List the jobs of a specific project. This will list the jobs by creation date,
independently of what spider they belong to.

#### **Method:** GET

##### **Parameters**

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| pid | path |  | Yes | string |
| page | query | DataPaginated. | No | number |
| page_size | query | DataPaginated. | No | number |

##### **Responses**

| Code | Schema |
| ---- | ------ |
| 200 | [ProjectJob](#projectjob) |

</details>

<details>
<summary markdown="span">**GET** `/api/projects/{pid}/spiders/{sid}/jobs`</summary>

#### **Description**
List spider jobs.

#### **Method:** GET

##### **Parameters**

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| pid | path |  | Yes | string |
| sid | path |  | Yes | string |
| cronjob | query | Cronjob | No | number |
| status | query | Job status | No | string |
| tag | query | Job tag | No | string |
| page | query | A page number within the paginated result set. | No | integer |
| page_size | query | Number of results to return per page. | No | integer |

##### **Responses**

| Code | Schema |
| ---- | ------ |
| 200 | [PaginatedResults](#paginatedresults)[[SpiderJob](#spiderjob)] |

</details>

<details>
<summary markdown="span">**POST** `/api/projects/{pid}/spiders/{sid}/jobs`</summary>

#### **Description**
Create spider job.

#### **Method:** POST

##### **Parameters**

| Name | Located in | Required | Schema |
| ---- | ---------- | -------- | ---- |
| pid | path | Yes | string |
| sid | path | Yes | string |
| data | body | Yes | [SpiderJobCreate](#spiderjobcreate) |
| async | query | No | boolean |

##### **Responses**

| Code | Schema |
| ---- | ------ |
| 201 | [SpiderJobCreate](#spiderjobcreate) |

</details>

<details>
<summary markdown="span">**GET** `/api/projects/{pid}/spiders/{sid}/jobs/{jid}`</summary>

#### **Description**
Get spider job.

#### **Method:** GET

##### **Parameters**

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| jid | path | A unique integer value identifying this spider job. | Yes | integer |
| pid | path |  | Yes | string |
| sid | path |  | Yes | string |

##### **Responses**

| Code | Schema |
| ---- | ------ |
| 200 | [SpiderJob](#spiderjob) |

</details>

<details>
<summary markdown="span">**PUT** `/api/projects/{pid}/spiders/{sid}/jobs/{jid}`</summary>

#### **Description**
Update spider job.

#### **Method:** PUT

##### **Parameters**

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| jid | path | A unique integer value identifying this spider job. | Yes | integer |
| pid | path |  | Yes | string |
| sid | path |  | Yes | string |
| data | body |  | Yes | [SpiderJobUpdate](#spiderjobupdate) |

##### **Responses**

| Code | Schema |
| ---- | ------ |
| 200 | [SpiderJobUpdate](#spiderjobupdate) |

</details>

<details>
<summary markdown="span">**PATCH** `/api/projects/{pid}/spiders/{sid}/jobs/{jid}`</summary>

#### **Description**
Partial update spider job.

#### **Method:** PATCH

##### **Parameters**

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| jid | path | A unique integer value identifying this spider job. | Yes | integer |
| pid | path |  | Yes | string |
| sid | path |  | Yes | string |
| data | body |  | Yes | [SpiderJob](#spiderjob) |

##### **Responses**

| Code | Schema |
| ---- | ------ |
| 200 | [SpiderJob](#spiderjob) |

</details>

<details>
<summary markdown="span">**GET** `/api/projects/{pid}/spiders/{sid}/jobs/{jid}/data`</summary>

#### **Description**
Get job data.

#### **Method:** GET

##### **Parameters**

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| jid | path |  | Yes | string |
| pid | path |  | Yes | string |
| sid | path |  | Yes | string |
| page | query | A page number within the paginated result set. | No | integer |
| page_size | query | Number of results to return per page. | No | integer |
| type | query | Spider job data type. | No | string |

##### **Responses**

| Code | Schema |
| ---- | ------ |
| 200 | [PaginatedResults](#paginatedresults)[] |

</details>

<details>
<summary markdown="span">**POST** `/api/projects/{pid}/spiders/{sid}/jobs/{jid}/data/{id}/delete`</summary>

#### **Description**
Delete job data.

#### **Method:** GET

##### **Parameters**

| Name | Located in | Required | Schema |
| ---- | ---------- | -------- | ---- |
| id | path | Yes | string |
| jid | path | Yes | string |
| pid | path | Yes | string |
| sid | path | Yes | string |

##### **Responses**

| Code | Schema |
| ---- | ------ |
| 200 | [DeleteJobData](#deletejobdata) |

</details>

## Serializers

All of the following serializers can be found in their corresponding files
in [`estela-api/api/serializers/`](https://github.com/bitmakerla/estela/tree/main/estela-api/api/serializers).

<details>
<summary markdown="span" id="authtoken">**AuthToken**</summary>

| Name | Type | Required |
| ---- | ---- | -------- |
| username | string | Yes |
| password | string | Yes |

</details>

<details>
<summary markdown="span" id="token">**Token**</summary>

| Name | Type | Required |
| ---- | ---- | -------- |
| user | string | No |
| key | string | Yes |

</details>

<details>
<summary markdown="span" id="user">**User**</summary>

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| id | integer |  | No |
| email | string (email) |  | No |
| username | string | Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only. | Yes |
| password | string |  | Yes |

</details>

<details>
<summary markdown="span" id="userdetail">**UserDetail**</summary>

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| username | string | Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only. | Yes |
| email | string (email) |  | No |

</details>

<details>
<summary markdown="span" id="permission">**Permission**</summary>

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| user | [UserDetail](#userdetail) |  | No |
| permission | string | _Enum:_ `"EDITOR"`, `"VIEWER"`, `"OWNER"` | No |

</details>

<details>
<summary markdown="span" id="project">**Project**</summary>

| Name | Type | Required |
| ---- | ---- | -------- |
| pid | string (uuid) | No |
| name | string | Yes |
| container_image | string | No |
| users | [ [Permission](#permission) ] | No |

</details>

<details>
<summary markdown="span" id="projectupdate">**ProjectUpdate**</summary>

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| pid | string (uuid) |  | No |
| name | string |  | Yes |
| users | [ [UserDetail](#userdetail) ] |  | No |
| email | string (email) |  | No |
| action | string | _Enum:_ `"remove"`, `"add"` | No |
| permission | string | _Enum:_ `"EDITOR"`, `"VIEWER"` | No |

</details>

<details>
<summary markdown="span" id="spider">**Spider**</summary>

| Name | Type | Required |
| ---- | ---- | -------- |
| sid | integer | No |
| name | string | Yes |
| project | string (uuid) | Yes |

</details>

<details>
<summary markdown="span" id="deploy">**Deploy**</summary>

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| did | integer |  | No |
| project | string (uuid) |  | Yes |
| user | [UserDetail](#userdetail) |  | Yes |
| status | string | _Enum:_ `"SUCCESS"`, `"BUILDING"`, `"FAILURE"`, `"CANCELED"` | No |
| spiders | [ [Spider](#spider) ] |  | No |
| created | dateTime |  | No |

</details>

<details>
<summary markdown="span" id="deploycreate">**DeployCreate**</summary>

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| did | integer |  | No |
| status | string | _Enum:_ `"SUCCESS"`, `"BUILDING"`, `"FAILURE"`, `"CANCELED"` | No |
| created | dateTime |  | No |
| project_zip | string (uri) |  | No |

</details>

<details>
<summary markdown="span" id="deployupdate">**DeployUpdate**</summary>

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| did | integer |  | No |
| status | string | _Enum:_ `"SUCCESS"`, `"BUILDING"`, `"FAILURE"`, `"CANCELED"` | No |
| spiders_names | [ string ] |  | No |

</details>

<details>
<summary markdown="span" id="spiderjobarg">**SpiderJobArg**</summary>

| Name | Type | Required |
| ---- | ---- | -------- |
| name | string | Yes |
| value | string | Yes |

</details>

<details>
<summary markdown="span" id="spiderjobenvvar">**SpiderJobEnvVar**</summary>

| Name | Type | Required |
| ---- | ---- | -------- |
| name | string | Yes |
| value | string | Yes |

</details>

<details>
<summary markdown="span" id="spiderjobtag">**SpiderJobTag**</summary>

| Name | Type | Required |
| ---- | ---- | -------- |
| name | string | Yes |

</details>

<details>
<summary markdown="span" id="spidercronjob">**SpiderCronJob**</summary>

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| cjid | integer |  | No |
| spider | integer |  | Yes |
| created | dateTime |  | No |
| name | string |  | No |
| cargs | [ [SpiderJobArg](#spiderjobarg) ] |  | No |
| cenv_vars | [ [SpiderJobEnvVar](#spiderjobenvvar) ] |  | No |
| ctags | [ [SpiderJobTag](#spiderjobtag) ] |  | No |
| schedule | string |  | No |
| status | string | _Enum:_ `"ACTIVE"`, `"DISABLED"` | No |
| unique_collection | boolean |  | No |

</details>

<details>
<summary markdown="span" id="spidercronjobcreate">**SpiderCronJobCreate**</summary>

| Name | Type | Required |
| ---- | ---- | -------- |
| cjid | integer | No |
| name | string | No |
| cargs | [ [SpiderJobArg](#spiderjobarg) ] | No |
| cenv_vars | [ [SpiderJobEnvVar](#spiderjobenvvar) ] | No |
| ctags | [ [SpiderJobTag](#spiderjobtag) ] | No |
| schedule | string | No |
| unique_collection | boolean | No |

</details>

<details>
<summary markdown="span" id="spidercronjobupdate">**SpiderCronJobUpdate**</summary>

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| cjid | integer |  | No |
| status | string | _Enum:_ `"ACTIVE"`, `"DISABLED"` | No |
| schedule | string |  | No |
| unique_collection | boolean |  | No |

</details>

<details>
<summary markdown="span" id="projectjob">**ProjectJob**</summary>

| Name | Type | Required |
| ---- | ---- | -------- |
| results | [SpiderJob](#spiderjob) | Yes |
| count | integer | Yes |

</details>

<details>
<summary markdown="span" id="spiderjob">**SpiderJob**</summary>

| Name | Type | Required |
| ---- | ---- | -------- |
| jid | integer | No |
| spider | integer | Yes |
| created | dateTime | No |
| name | string | No |
| args | [ [SpiderJobArg](#spiderjobarg) ] | No |
| env_vars | [ [SpiderJobEnvVar](#spiderjobenvvar) ] | No |
| tags | [ [SpiderJobTag](#spiderjobtag) ] | No |
| job_status | string | No |
| cronjob | integer | No |

</details>

<details>
<summary markdown="span" id="spiderjobcreate">**SpiderJobCreate**</summary>

| Name | Type | Required |
| ---- | ---- | -------- |
| jid | integer | No |
| name | string | No |
| args | [ [SpiderJobArg](#spiderjobarg) ] | No |
| env_vars | [ [SpiderJobEnvVar](#spiderjobenvvar) ] | No |
| tags | [ [SpiderJobTag](#spiderjobtag) ] | No |
| job_status | string | No |
| cronjob | integer | No |

</details>

<details>
<summary markdown="span" id="spiderjobupdate">**SpiderJobUpdate**</summary>

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| jid | integer |  | No |
| status | string | _Enum:_ `"IN_QUEUE"`, `"WAITING"`, `"RUNNING"`, `"STOPPED"`, `"INCOMPLETE"`, `"CANCELLED"`, `"COMPLETED"`, `"ERROR"` | No |

</details>

<details>
<summary markdown="span" id="paginatedresults">**PaginatedResults**</summary>

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| count | integer |  | Yes |
| next | string($uri) |  | No |
| previous | string($uri) |  | No |
| results | [object] | The type of this attribute will vary throughout the documentation. This is an array of objects, depending on what object is being queried. | yes |

</details>

<details>
<summary markdown="span" id="deletejobdata">**DeleteJobData**</summary>

| Name | Type | Required |
| ---- | ---- | -------- |
| count | integer | Yes |

</details>

<details>
<summary markdown="span" id="getlogs">**GetLogs**</summary>

| Name | Type | Required |
| ---- | ---- | -------- |
| logs | [ string ] | Yes |
| count | integer | Yes |

</details>

{::options parse_block_html="false" /}
