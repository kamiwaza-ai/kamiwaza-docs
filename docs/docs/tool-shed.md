# Tool Shed

## Overview

The Tool Shed provides MCP (Model Context Protocol) servers that extend your AI assistants' capabilities. These are modular services that work behind the scenes - giving your AI access to specialized functions.

## How It Works

1. **Deploy Tools**: Select from pre-built tools or deploy any Docker-based MCP server
2. **Automatic Discovery**: AI assistants automatically find and use available tools
3. **Seamless Integration**: Tools enhance AI responses without user intervention

## Available Tools

### Pre-built Tools
- **Web Search**: Real-time internet searches (requires Tavily API key)
- **Task Planning**: Todo list management and multi-step task tracking

### Custom Tools
Deploy any MCP-compatible Docker image to add your own tools:
- Company-specific integrations
- Proprietary data access
- Custom business logic
- Any dockerized MCP server

## Key Differences from App Garden

- **App Garden**: Complete AI applications with user interfaces 
- **Tool Shed**: Background services that any LLM can use

## Using Tools

Once deployed, tools are automatically available to:
- Kaizen (the Kamiwaza AI Agent)
- Any other MCP Client

No configuration needed - AI assistants discover and use tools as needed.