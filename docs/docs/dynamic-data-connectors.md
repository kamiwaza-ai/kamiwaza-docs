# Dynamic Data Connectors

Dynamic data connectors let you turn an external REST or JSON data source
into a **governed Kamiwaza dataset** without writing any connector code.
You describe the source declaratively — its URL, endpoint, authentication,
and the attribute fields that drive access control — and the connector‑spec
engine materializes it as a catalog dataset that every caller reads through
a single, authoritative, fail‑closed attribute gate.

:::note
This page covers the **declarative connector‑spec engine** and the Data
Connector Builder's *Register Governed Dataset* action. It is distinct from
[Data Connectors](./data-connectors.md), which covers the OAuth account
connectors for Microsoft 365 and Google Workspace.
:::

## What you get

- **One generic engine, no per‑vendor code.** A new source is a *spec*, not
  a new plugin. The same in‑core engine interprets every spec.
- **Authoritative per‑record gating.** An attribute gate runs *after fetch*
  on every retrieval and decides, per record and per field, what each caller
  sees — based on the caller's verified attributes. The gate fails closed: a
  record is dropped unless the caller is explicitly entitled to it.
- **Identical gating everywhere.** The same gate applies to local retrieval
  and to federated retrieval across a cluster mesh — there is no path that
  returns ungated records.
- **Credentials stay in the broker.** A spec references a credential by URN;
  the secret value is resolved at fetch time and never appears in the spec,
  in logs, or in the catalog.

## Concepts

| Term | Meaning |
|------|---------|
| **Connector spec** | A declarative, versioned JSON document describing a source: `base_url`, `endpoint`, `auth`, `index`, bounded `pagination`, `data_attribute_fields`, and a `gate`. |
| **Attribute gate** | An installed gate class, referenced by classpath in the spec, that filters and redacts records based on the caller's attributes. |
| **Register from spec** | The API that persists a spec as a standing catalog dataset, binds its gate, and creates its owner relationship — without pulling any records. |
| **Data Connector Builder** | The authoring app that maps a builder definition onto a connector spec and calls *register from spec* for you. |
| **Publisher** | The role (or per‑cluster relationship) authorized to register governed datasets. |

## Authoring a governed dataset (Data Connector Builder)

The Data Connector Builder is the no‑code path. From a connector definition
that already pulls records from a REST or JSON source, the **Register
Governed Dataset** action:

1. Maps the builder definition onto a core connector spec.
2. Adds the dataset identity (`index`), the `data_attribute_fields` that the
   gate reads, and the `gate` (its classpath and config).
3. Calls *register from spec* on the core API, forwarding your identity so
   the platform can check that you may publish.

If you lack publish authority, the action disables itself with a clear
reason ("ask an administrator to grant the publisher role") rather than
failing opaquely. If the source's authentication kind is not supported, the
action disables with that reason before you submit.

### Supported authentication

| Kind | Use |
|------|-----|
| `none` | Public endpoints. |
| `api_key` | A key sent in a header *or* a query parameter. |
| `basic` | HTTP Basic (`user:password`, resolved from the broker). |
| `bearer` | `Authorization: Bearer <token>`. |
| `sigv4` | AWS Signature V4 (e.g. Amazon OpenSearch Service; `service` is `es` or `aoss`). |

Pagination is bounded by the spec (`max_pages`, `page_size`). The engine
injects the source's native offset window; sources whose pagination differs
are registered single‑page for now (broader pagination is on the roadmap).

## Registering a governed dataset (API)

You can register a spec directly — useful for sources the builder runtime
cannot author end‑to‑end (for example, SigV4 signing), or for automation.

### `POST /api/catalog/datasets/register-from-spec`

Body: the raw connector spec. Returns `201` with the new dataset URN.
Registration persists the spec, binds the gate atomically, and creates the
owner relationship; it does **not** fetch any records.

```json
{
  "spec_version": "connector-spec.v1",
  "platform": "opensearch",
  "base_url": "https://search-example.us-east-1.es.amazonaws.com",
  "endpoint": {
    "method": "POST",
    "path": "/{index}/_search",
    "body_template": { "query": { "match_all": {} } },
    "items_path": "$.hits.hits"
  },
  "index": "events",
  "pagination": { "max_pages": 5, "page_size": 100 },
  "auth": {
    "kind": "sigv4",
    "credential_ref": "urn:li:secret:example-aws",
    "parameters": { "region": "us-east-1", "service": "es" }
  },
  "field_mappings": { "_source.region": "region", "_source.owner": "owner" },
  "data_attribute_fields": ["region", "owner"],
  "time_field": "ts",
  "filterable_fields": ["region", "ts"],
  "gate": {
    "type": "kamiwaza_extensions.example.gate.RegionGate",
    "config": {}
  }
}
```

Response:

```json
{ "dataset_urn": "urn:li:dataset:(urn:li:dataPlatform:opensearch,events,PROD)" }
```

Common error responses:

| Status | Reason |
|--------|--------|
| `400` | Invalid or drifted spec, unsupported auth kind, private/loopback `base_url`, or a gate of the wrong kind. |
| `403` | No publish authority, or a registration request that originated from a peer cluster. |
| `409` | A dataset with the same derived URN is already registered. |
| `412` | Gate binding attempted while authentication is disabled. |
| `422` | `credential_ref` does not resolve, or resolves to a workroom‑scoped secret. |

### `DELETE /api/catalog/datasets/register-from-spec`

Deregisters a governed dataset by URN.

### Publishers

Publish authority is granted to administrators automatically. To delegate it:

```
POST   /api/catalog/datasets/publishers   { "subject_user_id": "<user-id>" }
DELETE /api/catalog/datasets/publishers   { "subject_user_id": "<user-id>" }
```

### Credentials

A spec never carries a secret value. Create a credential, then reference its
URN from the spec:

```
POST /api/catalog/secrets/   { "name": "example-aws", "value": "<secret>", "owner": "<user-id>" }
```

For `basic`, the value is `user:password`. For `bearer`, the token. For
`sigv4`, a JSON object `{"access_key": "...", "secret_key": "...", "session_token": "..."}`.

## Reading a governed dataset

Consume a governed dataset through the **retrieval** service. The gate runs
at the retrieval seam under your verified attributes; you only ever receive
records you are entitled to.

```
POST /api/retrieval/jobs
{
  "dataset_urn": "urn:li:dataset:(urn:li:dataPlatform:opensearch,events,PROD)",
  "transport": "inline",
  "options": { "narrowing_filter": { "time_range": { "gte": "...", "lte": "..." } } }
}
```

The inline response carries the gate‑released records plus a gate audit
footer (`included` / `redacted` / `total`). Caller narrowing rides
`options.narrowing_filter` only — it can shrink the result (by time range or
allow‑listed terms) but never widen it.

### Across a cluster mesh

To read a governed dataset on a peer cluster, route through the mesh proxy:

```
POST /api/mesh/{cluster}/api/retrieval/jobs
```

The gate fires on the **peer**, under your originating verified attributes,
so records are redacted before they cross the mesh. Federated consumption of
a governed dataset is constrained to this retrieval path; the cross‑cluster
job‑execution path is rejected for governed datasets so there is no route
that returns ungated records.

## API reference page

The full request/response schema for these routes is published in the
[API Reference](/sdk/api/). The connector‑spec routes appear once the docs
build's OpenAPI sync (`npm run sync-openapi`) runs against a Kamiwaza
checkout that includes the connector‑spec engine, then `npm run build`.
