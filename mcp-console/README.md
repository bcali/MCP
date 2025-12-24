# MCP Hub Console

A modern, web-based dashboard for managing your MCP Hub.

## Features
- **Dashboard**: Real-time status, active connections, and execution metrics.
- **Connections**: Manage SSE and stdio MCP server connections.
- **Tools Catalog**: Browse and test all available MCP tools across your connections.
- **Runs**: Detailed execution history with input/output traces and logs.

## Tech Stack
- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS 4 + Material UI (MUI)
- **Icons**: Lucide React
- **Charts**: Recharts

## Getting Started

1. **Install Dependencies**:
   ```bash
   cd mcp-console
   npm install
   ```

2. **Run Development Server**:
   ```bash
   npm run dev
   ```

3. **Build for Production**:
   ```bash
   npm run build
   ```

## Backend Integration
Currently, the console uses **mock data** to demonstrate functionality. To connect to your real `mcp-hub` backend, you will need to update `src/app/services/api.ts` (coming soon) to point to your Cloud Run URL and provide your `MCP_HUB_API_KEY`.

## License
MIT

