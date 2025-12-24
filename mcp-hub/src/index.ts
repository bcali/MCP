#!/usr/bin/env node
import express from 'express';
import dotenv from 'dotenv';
import { randomUUID } from 'node:crypto';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
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

const app = express();
app.disable('x-powered-by');

app.get('/healthz', (_req, res) => res.status(200).json({ ok: true }));

// Management API for the Console
app.get('/v1/status', apiKeyAuth(env.MCP_HUB_API_KEY), async (_req, res) => {
  res.json({
    status: 'up',
    version: '0.1.0',
    uptime: process.uptime(),
    activeConnections: transports.size,
  });
});

app.get('/v1/tools', apiKeyAuth(env.MCP_HUB_API_KEY), async (_req, res) => {
  try {
    // We can call the server's internal listTools handler
    const result = await server.listTools();
    res.json(result.tools);
  } catch (e) {
    console.error('[mcp-hub] Error listing tools:', e);
    res.status(500).json({ error: 'Failed to list tools' });
  }
});

app.get('/v1/runs', apiKeyAuth(env.MCP_HUB_API_KEY), async (_req, res) => {
  // HubStore doesn't have a listRuns yet, but we can add it or just return empty for now
  // For now, let's try to get what we can from the store if it supports it
  try {
    const artifacts = await store.listArtifacts('run'); // We often store run summaries as artifacts
    res.json(artifacts);
  } catch (e) {
    res.json([]);
  }
});

// Track active SSE transports by session ID
const transports = new Map<string, SSEServerTransport>();

app.get('/v1/sse', apiKeyAuth(env.MCP_HUB_API_KEY), async (req, res) => {
  const transport = new SSEServerTransport('/mcp', res);
  const sessionId = transport.sessionId;
  transports.set(sessionId, transport);
  console.error(`[mcp-hub] New SSE connection established. Session: ${sessionId}`);
  
  await server.connect(transport);
  
  transport.onclose = () => {
    console.error(`[mcp-hub] SSE connection closed for session ${sessionId}`);
    transports.delete(sessionId);
  };
});

app.post('/mcp', async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports.get(sessionId);

  if (!transport) {
    console.error(`[mcp-hub] No transport found for session ${sessionId}`);
    res.status(404).send('Session not found');
    return;
  }

  await transport.handlePostMessage(req, res);
});

app.listen(env.PORT, env.HOST, () => {
  console.error(`MCP Hub listening on http://${env.HOST}:${env.PORT}`);
  console.error(`MCP endpoint: /v1/sse (recommended for mcp-remote) or /mcp`);
});


