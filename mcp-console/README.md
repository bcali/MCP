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
The console is pre-configured to talk to your `mcp-hub` backend. 

- **Configuration**: See `src/app/config.ts` for backend URL and API key settings.
- **Service Layer**: `src/app/services/api.ts` handles communication with the Hub's management endpoints.
- **Mock Data**: Currently uses mock data for some complex lists (Tools, Runs), but is wired to real data for Hub Status and Active Connections.

## License
MIT

