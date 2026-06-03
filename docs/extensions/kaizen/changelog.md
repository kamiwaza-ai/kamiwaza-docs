---
title: Kaizen Changelog
description: Version history and changes for Kaizen.
---

# Kaizen Changelog

This document tracks major changes, feature additions, and improvements in the Kaizen agent platform.

## Version 1.4.0

### Major Features

#### 1. Skills-First Agent Workflows
- **Reusable skills**: Expanded Kaizen's built-in skill system with richer prebuilt capabilities, including chart, map, PDF, PPTX, and skill-builder workflows.
- **Skills over bundles**: Continued the shift away from older bundle-centric behavior toward reusable, agent-native skills and defaults.
- **Skill visibility**: Improved agent creation and conversation UX so active skills and skill configuration are easier to inspect and manage.

#### 2. Context-Aware Document Processing
- **Context Service integration**: Added first-class support for collections, pipeline jobs, retrieval, and semantic search through Kamiwaza Context Service.
- **Ingestion workflows**: Agents can submit files for processing, monitor progress, and use retrieved context in downstream work.
- **Operational guardrails**: Automatic context-search tool injection was temporarily removed while internal authentication issues are stabilized.

#### 3. Better Model, Tool, and Enterprise Integrations
- **Kamiwaza model access**: Kaizen now centers on Kamiwaza-managed model deployments and custom endpoints instead of direct Anthropic or Claude-specific setup.
- **Tool Garden and MCP improvements**: Improved Tool Garden MCP discovery, authentication, PAT fallback, host resolution, and error handling.
- **Microsoft 365 and SharePoint**: Expanded M365 and SharePoint browsing, download handling, schemas, and timeout behavior for more reliable enterprise file access.

#### 4. Workroom-Aware and App Garden-Ready Deployment
- **Workroom preservation**: Kaizen now preserves workroom context across deployments and related API calls.
- **App Garden compatibility**: Improved App Garden deployment compatibility, runtime defaults, and route/base-path behavior in packaged deployments.
- **Release metadata**: Updated extension metadata, preview image handling, and compatibility to target Kamiwaza `>=0.10.0`.

#### 5. Sandbox and Runtime Controls
- **LLM tuning controls**: Added configurable timeout, retry, and consumer-hardware defaults for agent model calls.
- **Sandbox storage options**: Added configurable sandbox storage sizing and persistence controls for workspace durability.
- **Runtime hardening**: Improved Kubernetes sandbox/runtime support, health checks, and container security context handling.

#### 6. UX and Reliability Improvements
- **Conversation experience**: Improved approval cards, error toasts, file previews, citations, and conversation reliability under failure conditions.
- **File handling**: Added support for image attachments and larger uploads, with frontend middleware updates for bigger payloads.
- **Workspace polish**: Improved agent creation wizard layout, workspace panels, and context-processing progress surfaces.

### Technical Improvements
- **Security**: Hardened error sanitization, upstream error handling, TLS/SSL behavior, and container/runtime defaults.
- **Platform resilience**: Added platform event logging, HTTP pool improvements, better health endpoints, and more robust SSE/conversation handling.
- **Dependency maintenance**: Upgraded vulnerable dependencies, refreshed SDK patches, and improved test coverage across context, MCP, runtime-default, and sandbox flows.

---

## Version 1.3.2 vs 0.9.0

### 🚀 Major Features

#### 1. App Garden Integration
- **Deployment**: Now fully deployable as a Kamiwaza App Garden extension.
- **Configuration**: Auto-generated `docker-compose` and metadata for seamless platform integration.
- **Streaming**: Migrated from WebSockets to **Server-Sent Events (SSE)** for better compatibility with corporate proxies and HTTP-only environments.

#### 2. Advanced Skills System
- **Custom Knowledge**: Inject domain expertise into agents.
- **Skill Types**:
  - **Repository Skills**: Always-active context (policies, business rules).
  - **Knowledge Skills**: Triggered by specific keywords.
  - **Task Skills**: Pre-defined workflows with inputs.

#### 3. MCP (Model Context Protocol) Integration
- **External Tools**: Connect agents to external APIs and services (Zapier, Google Workspace, Slack).
- **Security**: Encrypted storage for authentication headers and keys.
- **Management**: UI for configuring and testing MCP server connections.

#### 4. Enterprise Security & Governance
- **Action Confirmation**: Configurable policies for tool execution:
  - *Never Confirm*: Autonomous execution.
  - *Confirm Risky*: Pauses for high-risk actions (file deletion, network calls).
  - *Always Confirm*: Manual approval for every step.
- **Sandbox Controller**: Optional secure mode for strict Docker isolation (Phase 8.5).

#### 5. Enhanced Workspace & File Management
- **File Uploads**: "Paperclip" button to inject files directly into the agent's workspace.
- **File Downloads**: Browse and download generated files (reports, code) from the side panel.
- **Activity Stream**: Real-time "Thinking", "Tool Usage", and "Result" blocks for full visibility into agent logic.

#### 6. UX Improvements
- **ChatGPT-Style Sidebar**: Time-grouped conversation history (Today, Yesterday, Last 7 Days).
- **Inline Confirmation**: Approve or reject agent actions directly within the chat stream.
- **Stuck Detection**: If an agent gets stuck in a loop or repetitive behavior, Kaizen automatically detects this and can help recover, ensuring your agent continues making progress on your tasks.

#### 7. Microsoft 365 Integration
- **Cloud Connectors**: Connect directly to SharePoint and OneDrive to import documents into the workspace.
- **User-Delegated Auth**: Secure OAuth flow ensures users only access files they have permission to see.

### 🛠 Technical Improvements
- **Backend**: Migrated to FastAPI + Python 3.12.
- **Frontend**: Upgraded to Next.js 15.
- **Database**: Robust PostgreSQL storage with Alembic migrations for agents, secrets, and conversation history.
- **SDK**: Updated to OpenHands SDK 1.8.2 with custom SSL patching for internal service communication.

---

## Historical Version Summary

| Version | Status | Key Focus |
| :--- | :--- | :--- |
| **1.4.0** | Production | Skills-first workflows, context pipelines, runtime hardening. |
| **1.3.2** | Production | App Garden deployment, SSE streaming, Polish. |
| **1.2.0** | Feature Complete | Sandbox Controller, File Uploads. |
| **1.1.0** | Security | Security Policies, MCP Integration. |
| **1.0.0** | Core Features | Skills System, Workspace Visibility. |
| **0.9.0** | MVP | Basic Chat, Docker Execution, Simple CRUD. |
