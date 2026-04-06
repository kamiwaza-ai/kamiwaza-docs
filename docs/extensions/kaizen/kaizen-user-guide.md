---
title: Kaizen User Guide
description: Complete guide for creating and managing AI agents with Kaizen.
---

# Kaizen User Guide

Welcome to **Kaizen**, an AI agent platform built by Kamiwaza. Kaizen lets you create AI agents that go beyond simple chat. They can execute code, search the web, connect to corporate tools like Microsoft 365, and produce polished deliverables like charts, PDFs, and presentations.

Instead of writing code to configure agents, you get a visual interface. Instead of terminal output, you get a real-time chat where you can watch your agent work and download what it produces.

If you launch Kaizen from **Workroom Manager**, the conversation runs inside that workroom context. That lets analysts keep their agent activity aligned to a specific mission or case while still using the same Kaizen workflows described here.

---

## Launch Kaizen

Kaizen is available as an extension in **App Garden**.

1. Open **App Garden** in the Kamiwaza UI.
2. Locate the **Kaizen** app and click **Deploy**.
3. Choose whether you want an **Ephemeral Session**. Leave the default settings unless you have a specific reason to change them.

![Ephemeral session configuration](/img/extensions/kaizen/page-04-image-02.png)

4. Click **Deploy**.
5. Once the deployment is ready, click **Open App**.

![Open app](/img/extensions/kaizen/page-05-image-02.png)

---

## Getting Started

When you first open Kaizen, you'll see an empty Agent Library. This is your home base, where all your agents live and where you launch conversations.

![Kaizen home - the Agent Library](/img/extensions/kaizen/onboarding-01-home.png)

Each agent you create is a persistent configuration. Choose its AI model, attach skills and tools, and set a security policy. Then start as many conversations as you need.

Click **Create Your First Agent** to get started.

---

## Creating Your First Agent

The agent builder walks you through configuration in six steps.

### Step 1: Basic Configuration

![Create Agent form](/img/extensions/kaizen/onboarding-02-create-agent.png)

- **Name**: Give your agent a descriptive name for its purpose, such as "Data Analyst" or "Report Writer".
- **Model**: Select an AI model deployed on your Kamiwaza instance. Models are managed by your admin through the Kamiwaza Model Library.
- **Native Tool Calling**: Enable this if your model supports OpenAI-style function calling.
- **Instructions**: Add optional instructions to shape how the agent behaves, such as domain expertise, tone, or policies.

> **Tip:** Use Instructions to give your agent a specific role. Example: *"You are a financial analyst. Always format currency with two decimal places and cite data sources."*

### Step 2: Adding Skills

Kaizen uses the AgentSkills model. In practice, you can give an agent skills in two ways:

- **From Skills Library**: Attach published, reusable skills from your shared library.
- **Custom Skills**: Create agent-specific skills directly in Kaizen.

![Skills configuration](/img/extensions/kaizen/onboarding-03-skills.png)

Library skills are best for reusable capabilities your team wants to standardize across many agents. Custom skills are best for local instructions, business context, and lightweight workflows specific to one agent.

**Custom skill trigger options:**

- **Always Active**: The skill is always available to the agent.
- **Keyword Triggered**: The skill activates when matching keywords appear in the conversation.
- **Task Triggered**: The skill activates from explicit commands or workflow phrases and can include structured inputs.

> **Tip:** Start with a few small custom skills for instructions and domain context, then attach shared library skills for heavier packaged capabilities your team wants to reuse.

### Step 3: Attaching Packaged Skills

Many advanced capabilities are delivered as packaged skills from the Skills Library rather than a separate "bundle" system. You can browse the library and attach the skills your agent needs.

Common examples include skills for:

- **Charts and visualizations**
- **Maps and geospatial outputs**
- **PDF generation**
- **PowerPoint export**
- **Document ingestion and context processing**

Some Kaizen environments also include built-in default skills automatically, so your agent may already have baseline capabilities without any extra setup.

### Step 4: Connecting Tools (MCP Integrations)

MCP (Model Context Protocol) integrations give your agent access to external tools and services such as web search, APIs, databases, and more.

![MCP Integrations](/img/extensions/kaizen/onboarding-04-mcp.png)

Tools deployed through the Kamiwaza Tool Garden are automatically available for selection here. Your admin deploys tools to the platform, and they appear ready to attach to your agents.

You can also connect custom MCP servers for proprietary or third-party APIs using **+ Add Custom Server**.

> Without tools, your agent can only reason and write code. With tools, it can search Google, query databases, call REST APIs, interact with SaaS platforms, and much more within a single conversation.

### Step 5: Security Policy

Control how much autonomy your agent has. The security policy determines which actions require your approval before the agent executes them.

![Security Policy](/img/extensions/kaizen/onboarding-05-security.png)

**Three modes:**

- **Never Confirm**: The agent executes all actions autonomously. Best for trusted, low-risk tasks.
- **Always Confirm**: Every action requires your approval.
- **Confirm Risky Actions** (Recommended): Only actions above your chosen risk threshold need approval. The agent handles routine tasks on its own.

The **Risk Threshold** (`Low`, `Medium`, or `High`) determines the cutoff. With `Medium` selected, the agent asks for confirmation on medium- and high-risk actions but proceeds autonomously on low-risk ones. You can also choose whether actions with unknown risk levels require confirmation.

### Step 6: Review & Create

Before creating your agent, review the full configuration summary. Verify your model, custom skills, attached library skills, connected tools, and security policy.

![Review & Create](/img/extensions/kaizen/onboarding-06-review.png)

The summary badges give you an at-a-glance view of custom skills, library skills, MCP servers, and security policy. Once satisfied, click **Create Agent**.

---

## Your Agent Library

After creation, your agent appears in the library. Each agent card shows its name, model, and quick actions.

![Agent Library](/img/extensions/kaizen/onboarding-07-agent-library.png)

- **Chat**: Start a new conversation with this agent.
- **Private Session**: Start an ephemeral conversation that is automatically deleted when you leave. This is useful for sensitive or one-off tasks.
- **Configure**: Edit the agent's model, skills, bundles, tools, or security policy.
- **Delete**: Remove the agent and its conversations.

Create as many agents as you need, such as a research agent, a data analyst, or a report writer. Each agent keeps its own configuration and conversation history.

The left sidebar shows your recent conversations across all agents. Click any conversation to resume where you left off.

---

## Using Your Agent

### Sending Messages

Click **Chat** on any agent to start a conversation. Type your request in the message input and the agent will get to work. You can watch its progress in real time as it executes code, calls tools, and produces results.

### Uploading Files

Click the **+** button in the message input to attach files. You can upload from your local device or pull files directly from **Microsoft 365** (OneDrive, SharePoint).

![File upload options](/img/extensions/kaizen/onboarding-08-file-upload.png)

> **Note:** The Microsoft 365 connector must be configured by an administrator in the Kamiwaza UI before it is available to users. Once configured, you can browse and attach OneDrive and SharePoint files directly in your conversations.

When Kaizen is opened from a workroom, use these uploads and connected sources to support that workroom's analysis workflow.

### Grounded Answers and Citations

Depending on your deployment and the tools attached to your agent, Kaizen can produce grounded answers that include citations back to source material such as uploaded files, connected document stores, or web results.

To get the best results:

- attach the files or tools your agent should use before asking the question
- ask explicitly for citations when you need traceable answers
- verify that the cited sources actually support the claim before sharing the output

If a response should be grounded but comes back without citations, check whether the relevant data source, skill, or retrieval path is configured in your environment.

### Downloading Results

Any files created by the agent, including reports, charts, code, and presentations, appear in the workspace panel on the right side of the chat. You can preview and download them directly.

---

## Your Agent in Action

Here is a real example: a user asked their agent to find expense reports in OneDrive and generate a chart and summary PDF. The agent:

- found the expense report CSV in OneDrive
- analyzed the expense data
- generated a pie chart and bar chart
- created a professional PDF report with the analysis

The generated PDF is viewable and downloadable directly in the right panel.

![Agent in action - expense report analysis](/img/extensions/kaizen/onboarding-09-conversation.png)

---

## Agent Capabilities

| Capability | Description |
| :--- | :--- |
| **Generate Documents** | Create PDFs, PowerPoint presentations, and structured reports from your data or instructions. |
| **Create Visualizations** | Bar charts, line charts, pie charts, scatter plots, and interactive maps from your data. |
| **Search the Web** | Find current information, research topics, and gather data using connected search tools. |
| **Access Corporate Files** | Browse and analyze files from OneDrive and SharePoint through the Microsoft 365 integration. |
| **Analyze Data** | Process CSV files, run calculations, identify trends, and produce statistical summaries. |
| **Connect to APIs** | Interact with external services through MCP tool integrations, including CRMs, databases, and SaaS platforms. |
| **Code Execution** | Run commands and scripts in an isolated container environment. |
| **Real-time Streaming** | Watch the agent's thought process and terminal output live. |
| **Security Policies** | Configure sensitive-action controls with risk-based confirmation. |

---

## Tips for Success

- **Start Simple**: Create your first agent without complex skills or tools, then add them as needed.
- **Be Specific**: Clear, detailed prompts yield better results.
- **Use the Skills Library**: Attach published skills for common outputs like charts, PDFs, presentations, and document processing.
- **Check Connections**: If you use MCP tools, verify connections before saving.
- **Monitor Status**: Watch for "Waiting for Confirmation" states if you have strict security policies.

### Example Prompts

- *"Create a Python script that analyzes this CSV data and generates a summary report."*
- *"Find my expense reports in OneDrive and generate a chart of spending by category."*
- *"Research the latest trends in renewable energy and create a PowerPoint presentation."*
- *"Analyze this dataset and create a PDF report with visualizations."*

---

## Troubleshooting Kaizen

### The agent is waiting for confirmation

Your agent's security policy may require approval before it can run tools or commands. Approve the pending step, or update the policy in the agent configuration if the current threshold is too strict for the workflow.

### I cannot access Microsoft 365 files

The Microsoft 365 connector must be configured by an administrator before it appears to end users. If the option is missing or authentication fails, confirm the platform configuration with your administrator.

### I expected citations, but none appeared

Make sure the agent has access to the documents or tools it needs, and ask for citations explicitly when traceability matters. If the issue persists, verify the data source or retrieval configuration in your deployment.

### I need logs for a failed deployment or broken conversation

Start with the Kaizen deployment logs in the Kamiwaza log viewer, then review the platform-level guidance in [Observability](/observability). That is the fastest path for diagnosing extension startup failures, connector issues, or model-side errors.

---

## Learn More

- [Models Overview](/models/overview)
- [Tool Garden](/tool-garden)
- [Observability](/observability)
