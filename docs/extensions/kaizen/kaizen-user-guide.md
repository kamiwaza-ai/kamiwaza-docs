---
title: Kaizen User Guide
description: Complete guide for creating and managing AI agents with Kaizen.
---

# Kaizen User Guide

Welcome to **Kaizen**, an AI agent platform built by Kamiwaza. Kaizen empowers you to create, configure, and deploy intelligent agents capable of executing code, managing files, and integrating with external tools to accomplish virtually any task through natural conversation.

## Table of Contents
1. [Getting Started](#getting-started)
2. [Creating Your First Agent](#creating-your-first-agent)
3. [Using Your Agent](#using-your-agent)
4. [Agent Capabilities](#agent-capabilities)
5. [Tips for Success](#tips-for-success)

---

## Getting Started

### 1. Login to Kamiwaza
1. Navigate to your Kamiwaza instance URL.
2. If you see a "Your connection isn't private" message, click **Advanced** and then the link starting with **Continue to...**.
3. Enter your provided **Username** and **Password**, then click **Login**.

### 2. Access Kaizen
1. After logging in, click **Next** to proceed through the tutorial or click **Skip Tour**.
2. Click **Explore Apps** to proceed to the **App Garden**.

### 3. Deploy Kaizen
1. In the App Garden, locate the **Kaizen** app.

2. Click **Deploy**.

3. **Configuration Options**:
   - **Ephemeral Session**: Check this box if you want chat information to be purged on logout/timeout. Leave blank to save your chat history for future sessions.
   - Leave other defaults as they are unless you have specific requirements.
![Ephemeral session configuration](/img/extensions/kaizen/page-04-image-02.png)

4. Click **Deploy**.
5. Once deployed, click **Open App**.
![Open app](/img/extensions/kaizen/page-05-image-02.png)

---

## Creating Your First Agent

The Agent Wizard guides you through configuring your specialized AI assistant.

### Step 1: Start the Wizard
From the Kaizen home page, click **Create Your First Agent**.
![Create agent](/img/extensions/kaizen/page-05-image-03.png)

### Step 2: Basic Configuration
1. **Name**: Enter a name for your agent based on its task (e.g., "Code Assistant", "Data Analyst").
2. **Model**: Select a chat model from the list.
![Select model](/img/extensions/kaizen/page-06-image-02.png)
3. Click **Continue**.

### Step 3: Skills & Bundles
Skills give your agent domain knowledge.
1. Click **Continue** on the Skills page.
![Add Skills](/img/extensions/kaizen/page-07-image-02.png)

2. Select any available **Bundles** you wish to use (or skip). Bundles group related skills for specific domains.

3. Click **Continue**.
![Add Bundles](/img/extensions/kaizen/page-07-image-03.png)

### Step 4: MCP Integrations
Model Context Protocol (MCP) allows agents to connect to external tools and APIs.
1. Review available integrations (functionality may vary by release).


2. Click **Continue**.
![MCP integrations](/img/extensions/kaizen/page-08-image-02.png)

### Step 5: Security Policy
1. Select the appropriate **Security Policy** for your agent. This controls which actions (like file deletion or network requests) require your explicit approval.
![security policy](/img/extensions/kaizen/page-09-image-02.png)

2. Click **Continue**.

### Step 6: Review & Create
1. Review your agent's settings on the summary page.
2. Click **Create Agent**.
![Review](/img/extensions/kaizen/page-10-image-02.png)

3. Hover your cursor over your new agent card and click **Chat** to enter the workspace.
![Chat initiation](/img/extensions/kaizen/page-10-image-03.png)

---

## Using Your Agent

### The Chat Interface
The chat interface is your command center. It features:
- **Chat Box**: Communicate with your agent in plain English.
- **Live Workspace**: A side panel showing the agent's real-time activities, files, and "thinking" process.
![Chat](/img/extensions/kaizen/page-11-image-02.png)

### Interacting with Your Agent
1. **Type a Request**: Enter your goal in the chat box (e.g., "Create a Python script to analyze this data").
2. **Monitor Progress**: Watch the agent execute bash commands, edit files, and run code in the isolated container.
3. **Refine**: Based on the output, ask follow-up questions or provide corrections.

### Working with Files
- **Upload**: 
  1. Click the **plus sign** on the left side of the chat box to reveal additional options.
  2. Click the **paperclip icon** to upload files for the agent to investigate. These will appear in the `uploads` folder in the Live Workspace pane.
![Select file](/img/extensions/kaizen/page-12-image-02.png)
![Review files](/img/extensions/kaizen/page-12-image-03.png)

- **Download**: Any files created by the agent (reports, code, charts) can be downloaded directly from the Workspace pane.

### Connecting to Microsoft 365
Kaizen allows you to connect directly to your Microsoft 365 account to import files from SharePoint and OneDrive.

> **Note**: This feature requires that a Microsoft 365 connector be configured by your Kamiwaza administrator. If you don't see the cloud icon or encounter issues, contact your administrator to ensure the Microsoft 365 connector is properly set up. Refer to the [Data Connectors documentation](/data-connectors) for details.

1. **Connect**: Click the **plus sign** on the left side of the chat box, then click the **cloud icon** next to the paperclip in the chat interface.
2. **Authenticate**: Follow the prompt to log in with your Microsoft credentials (device code flow).
3. **Import**: Browse your available sites and drives, select the files you need, and import them directly into the agent's workspace.

### Ending a Session
Click **Logout** to exit the Kaizen app and return to the Kamiwaza Dashboard.
![Logout](/img/extensions/kaizen/page-13-image-04.png)

---

## Agent Capabilities

| Capability | Description |
| :--- | :--- |
| **Code Execution** | Run bash commands and scripts in an isolated Docker container. |
| **File Management** | Create, edit, organize, and delete files. |
| **Task Tracking** | Break down complex objectives into manageable steps. |
| **MCP Integration** | Connect to external APIs, databases, and tools. |
| **Real-time Streaming** | Watch the agent's thought process and terminal output live. |
| **Security Policies** | Configurable controls for sensitive actions. |

---

## Tips for Success

- **Start Simple**: Create your first agent without complex skills or tools, then add them as needed.
- **Be Specific**: Clear, detailed prompts yield better results.
- **Check Connections**: If using MCP tools, verify connections before saving.
- **Monitor Status**: Watch for "Waiting for Confirmation" states if you have strict security policies.
- **Use Skills**: Repository skills provide essential always-on context for your agent.

### Example Prompts
- *"Create a Python script that analyzes CSV data and generates a report."*
- *"Set up a basic FastAPI project with a health check endpoint."*
- *"Find all TODO comments in this codebase and summarize them."*
