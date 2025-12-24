# MCP Servers Monorepo

[![Build & Push mcp-hub](https://github.com/bcali/MCP/actions/workflows/mcp-hub-container.yml/badge.svg)](https://github.com/bcali/MCP/actions/workflows/mcp-hub-container.yml)
[![Deploy-CloudRun](https://github.com/bcali/MCP/actions/workflows/mcp-hub-cloudrun.yml/badge.svg)](https://github.com/bcali/MCP/actions/workflows/mcp-hub-cloudrun.yml)

A collection of high-performance Model Context Protocol (MCP) servers designed for both local and cloud-hosted environments.

## 🚀 Projects

### 🌩️ [MCP Hub](./mcp-hub)
A production-ready **Cloud MCP Gateway** that centralizes access to multiple tools and provides persistent state (memory, artifacts, and runs).
- **Core Primitives**: Centralized `memory`, `artifacts`, and durable `runs`.
- **Connectors**: Built-in integration for **Figma**, **GitHub**, **Confluence**, and **Slack**.
- **Cloud Native**: Designed for Google Cloud Run with SSE support and session affinity.
- **Persistent**: Backed by Postgres (Supabase) for durable cross-session memory.

### 🖥️ [MCP Console](./mcp-console)
A modern **Management Dashboard** for your MCP Hub.
- **Real-time Monitoring**: Track server uptime, version, and active client sessions.
- **Tool Catalog**: Browse all registered tools and their schemas.
- **Execution History**: View detailed traces of every tool run.
- **Connection Manager**: Configure and test new MCP server upstream connections.

### 🎨 [Gamma MCP Server](./gamma-mcp-server)
An MCP server for the [Gamma Generate API](https://developers.gamma.app).
- **Automated Design**: Generate presentations, documents, and social cards directly from your AI assistant.
- **Full Control**: Detailed imagery, layout, and theme customization via MCP tools.

---

## 🛠️ Quick Start (Cloud Hub)

### 1. Connect Cursor to your Cloud Hub
Add a new **SSE** server in Cursor Settings (`Ctrl+Shift+J`):
- **Name**: `hub`
- **URL**: `https://mcp-hub-6jzkdzuf2a-uc.a.run.app/v1/sse?key=YOUR_API_KEY`

### 2. Deploy your own
See the [mcp-hub deployment guide](./mcp-hub#deployment) for instructions on setting up your own instance on Google Cloud Run.

---

## 📦 Repository Structure

```text
.
├── .github/workflows/      # CI/CD Pipelines
├── gamma-mcp-server/       # Gamma API Integration
├── mcp-console/            # React Management Dashboard
├── mcp-hub/                # Cloud Gateway & State Hub
└── README.md               # You are here
```

## 📜 License
MIT © 2025 bcali
