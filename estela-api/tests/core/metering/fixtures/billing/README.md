Copies of the billing contract (ADR 0013) from the billing repo
(`bitmaker-cloud-openmeter`, `schemas/metering/`, commit b325773):

- `usage-recorded.v1.json`: the core schema, owned by billing.
- `estela.v1.json`: Estela's profile, owned by Estela.
- `estela-slice.json`: billing's example of a valid Estela slice.

`tests/core/metering/test_billing.py` validates the events Estela builds against them.
Refresh them when the contract changes.
