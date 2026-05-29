---
title: Graphiti Changelog
description: Version-specific release notes and migration highlights for Graphiti.
---

# Graphiti Changelog

This document tracks version-specific changes that affect Graphiti deployments and upgrades.

## Version 0.12.1

The 0.12.1 line changes Graphiti in ways operators should review before upgrading:

- The backend moved from **FalkorDB** to **Neo4j**.
- The service now runs on pinned prebuilt Graphiti and Neo4j images.
- LLM and embedding endpoint fallback behavior was tightened so the extension aligns cleanly with
  platform-injected model endpoints.

If you are upgrading an existing Graphiti deployment, also review the migration and rollback
guidance in the [Graphiti Service Guide](./graphiti-service-guide.md).
