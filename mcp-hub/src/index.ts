#!/usr/bin/env node
import express from 'express';
import dotenv from 'dotenv';
import { randomUUID } from 'node:crypto';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { loadEnv } from './config.js';
import { apiKeyAuth } from './auth.js';
import { registerTools } from './tools.js';
import { createStore } from './store/index.js';

dotenv.config();

const env = loadEnv();
const store = await createStore(env);

const server = new Server(
  { name: 'mcp-hub', version: '0.1.0' },
  {
    capabilities: {
      tools: {},
    },
  }
);

registerTools(server, store, env);

const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: () => randomUUID(),
});

await server.connect(transport);

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '15mb' }));

app.get('/healthz', (_req, res) => res.status(200).json({ ok: true }));

// Protect MCP endpoints with a simple API key. For Cursor + mcp-remote, the easiest path
// is putting it in the URL as ?key=... (or use Authorization header if your client supports it).
app.use(['/mcp', '/v1/sse'], apiKeyAuth(env.MCP_HUB_API_KEY));

app.all(['/mcp', '/v1/sse'], async (req, res) => {
  await transport.handleRequest(req, res, req.body);
});

app.listen(env.PORT, env.HOST, () => {
  console.error(`MCP Hub listening on http://${env.HOST}:${env.PORT}`);
  console.error(`MCP endpoint: /v1/sse (recommended for mcp-remote) or /mcp`);
});


