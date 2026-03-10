---
title: Data Catalog and Secrets
sidebar_label: Data Catalog
---

# Data Catalog and Secrets

Kamiwaza provides a centralized catalog for datasets, containers, and secrets. The catalog stores metadata, supports DataHub URNs, and is protected by access controls so only authorized users can view or change assets.

Kamiwaza Lite providers an internal homomorphic 

## Core entities

### Datasets
Datasets are the primary catalog entity. They are identified by DataHub URNs and can include schema metadata.

### Containers
Containers are logical groupings of datasets (for example, a project or domain). They also use DataHub URNs and support dataset membership APIs. They also map well to things like S3 buckets, file folders, etc.

### Secrets
Secrets are stored as catalog entities with encrypted values. Secret *metadata* is accessible via the API, but secret *values are never returned* through HTTP endpoints.

Secrets are encrypted with a dual DEK/KEK scheme, with support for secret rotation. 

## URN handling (DataHub)

Some DataHub URNs include forward slashes, which can conflict with path routing. Kamiwaza supports three approaches:

1. **V2 regex path endpoints (recommended)**
2. **Query-parameter endpoints (/by-urn)**
3. **Legacy path endpoints (simple URNs only)**

### Dataset endpoints

```text
GET    /api/catalog/datasets/v2/{dataset_urn}
GET    /api/catalog/datasets/v2/{dataset_urn}/schema
PATCH  /api/catalog/datasets/v2/{dataset_urn}
DELETE /api/catalog/datasets/v2/{dataset_urn}
PUT    /api/catalog/datasets/v2/{dataset_urn}/schema

GET    /api/catalog/datasets/by-urn?urn={full_urn}
GET    /api/catalog/datasets/by-urn/schema?urn={full_urn}
PATCH  /api/catalog/datasets/by-urn?urn={full_urn}
DELETE /api/catalog/datasets/by-urn?urn={full_urn}
PUT    /api/catalog/datasets/by-urn/schema?urn={full_urn}

GET    /api/catalog/datasets/{encoded_urn}
PATCH  /api/catalog/datasets/{encoded_urn}
DELETE /api/catalog/datasets/{encoded_urn}
```

### Container endpoints

```text
GET    /api/catalog/containers/v2/{container_urn}
PATCH  /api/catalog/containers/v2/{container_urn}
DELETE /api/catalog/containers/v2/{container_urn}
POST   /api/catalog/containers/v2/{container_urn}/datasets
DELETE /api/catalog/containers/v2/{container_urn}/datasets/{dataset_urn}

GET    /api/catalog/containers/by-urn?urn={full_urn}
PATCH  /api/catalog/containers/by-urn?urn={full_urn}
DELETE /api/catalog/containers/by-urn?urn={full_urn}
```

### Secret endpoints

```text
POST   /api/catalog/secrets
GET    /api/catalog/secrets
GET    /api/catalog/secrets/v2/{secret_urn}
DELETE /api/catalog/secrets/v2/{secret_urn}

GET    /api/catalog/secrets/by-urn?urn={full_urn}
DELETE /api/catalog/secrets/by-urn?urn={full_urn}
```

**Note:** Secret values are never exposed in API responses. Use secrets in connectors and deployments by reference.

## Access control

- **Datasets**: Protected by relationship-based access control (ReBAC). Owners/editors/viewers can access dataset metadata and schema.
- **Containers**: Container creation and membership changes require admin permissions.
- **Secrets**: Protected by ReBAC; only authorized users can view or delete secret metadata.

## Best practices

- Prefer `/v2/{urn}` or `/by-urn` endpoints for any URN that might contain `/` characters.
- Use secrets for credentials instead of embedding them in connector definitions or templates.
- Align dataset URNs with your DataHub naming conventions so discovery, lineage, and governance are consistent across tools.

