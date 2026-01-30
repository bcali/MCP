#!/usr/bin/env node
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { randomUUID } from 'node:crypto';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { loadEnv } from './config.js';
import { apiKeyAuth } from './auth.js';
import { registerTools, STATIC_TOOLS, resilience } from './tools.js';
import { createStore } from './store/index.js';
import { logger } from './utils/logger.js';
import { metrics } from './utils/metrics.js';

dotenv.config();

let env;
try {
  console.error('[MCP-HUB-STARTUP] Loading environment variables...');
  env = loadEnv();
  console.error('[MCP-HUB-STARTUP] ✓ Environment loaded successfully');
  logger.info('Environment loaded successfully', {
    hasDbUrl: !!env.DATABASE_URL,
    hasApiKey: !!env.MCP_HUB_API_KEY,
    port: env.PORT,
    host: env.HOST,
    nodeEnv: process.env.NODE_ENV
  });
} catch (e) {
  console.error('[MCP-HUB-STARTUP] ❌ FATAL: Failed to load environment variables');
  console.error('[MCP-HUB-STARTUP] Error:', e);
  logger.error('Failed to load environment variables', e);
  process.exit(1);
}

// Track database connection time
const dbStartTime = Date.now();
let store;
try {
  console.error('[MCP-HUB-STARTUP] Attempting database connection...');
  logger.info('Attempting database connection...');
  store = await createStore(env);
  const dbConnectionTime = Date.now() - dbStartTime;
  metrics.markDatabaseConnected(dbConnectionTime);
  console.error(`[MCP-HUB-STARTUP] ✓ Database connected in ${dbConnectionTime}ms`);
  logger.info('Database connected successfully', { connectionTime: dbConnectionTime });
} catch (e) {
  const errorMsg = e instanceof Error ? e.message : String(e);
  const errorStack = e instanceof Error ? e.stack : undefined;

  // Use console.error to ensure error appears in Cloud Run logs
  console.error('[MCP-HUB-STARTUP] ❌ FATAL: Database connection failed');
  console.error('[MCP-HUB-STARTUP] Error:', errorMsg);
  console.error('[MCP-HUB-STARTUP] Stack:', errorStack);

  metrics.recordStartupError(`Database connection failed: ${errorMsg}`);
  logger.error('Failed to connect to database', e, {
    message: errorMsg,
    stack: errorStack,
    dbUrl: env.DATABASE_URL ? 'present (masked)' : 'missing'
  });

  process.exit(1);
}

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
app.use(cors()); // Enable CORS for all origins (needed for GitHub Pages console)

// Track active SSE transports by session ID (declared early to avoid temporal dead zone)
const transports = new Map<string, SSEServerTransport>();

// Health checks
app.get('/healthz', (_req, res) => res.status(200).json({ ok: true }));

app.get('/healthz/ready', async (_req, res) => {
  try {
    // Quick database check
    await store.listRuns(1);
    res.status(200).json({
      ok: true,
      status: 'ready',
      database: 'connected',
      version: '0.1.0'
    });
  } catch (e) {
    logger.error('Readiness check failed', e);
    res.status(503).json({
      ok: false,
      status: 'not_ready',
      database: 'disconnected'
    });
  }
});

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
    res.json(STATIC_TOOLS);
  } catch (e) {
    logger.error('Error listing tools', e);
    res.status(500).json({ error: 'Failed to list tools' });
  }
});

app.get('/v1/runs', apiKeyAuth(env.MCP_HUB_API_KEY), async (_req, res) => {
  try {
    const runs = await store.listRuns(50);
    res.json(runs);
  } catch (e) {
    logger.error('Error listing runs', e);
    res.status(500).json({ error: 'Failed to list runs' });
  }
});

// Connection Management
app.get('/v1/connections', apiKeyAuth(env.MCP_HUB_API_KEY), async (_req, res) => {
  try {
    const connections = await store.listConnections();
    res.json(connections);
  } catch (e) {
    logger.error('Error listing connections', e);
    res.status(500).json({ error: 'Failed to list connections' });
  }
});

app.post('/v1/connections', apiKeyAuth(env.MCP_HUB_API_KEY), express.json(), async (req, res) => {
  try {
    const connection = await store.addConnection(req.body);
    res.json(connection);
  } catch (e) {
    logger.error('Error adding connection', e);
    res.status(500).json({ error: 'Failed to add connection' });
  }
});

app.delete('/v1/connections/:id', apiKeyAuth(env.MCP_HUB_API_KEY), async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: 'Missing connection ID' });
      return;
    }
    await store.deleteConnection(id);
    res.status(204).send();
  } catch (e) {
    logger.error('Error deleting connection', e);
    res.status(500).json({ error: 'Failed to delete connection' });
  }
});

// Metrics endpoints
app.get('/v1/metrics', apiKeyAuth(env.MCP_HUB_API_KEY), (_req, res) => {
  res.json(metrics.getHealthStatus());
});

app.get('/v1/metrics/startup', apiKeyAuth(env.MCP_HUB_API_KEY), (_req, res) => {
  res.json(metrics.getStartupMetrics());
});

app.get('/v1/metrics/tools', apiKeyAuth(env.MCP_HUB_API_KEY), (_req, res) => {
  res.json(metrics.getToolExecutionStats());
});

app.get('/v1/metrics/database', apiKeyAuth(env.MCP_HUB_API_KEY), (_req, res) => {
  const poolStats = metrics.getConnectionPoolStats();
  if (poolStats) {
    res.json(poolStats);
  } else {
    res.json({ message: 'Connection pool stats not available (using in-memory store)' });
  }
});

app.get('/v1/metrics/resilience', apiKeyAuth(env.MCP_HUB_API_KEY), (_req, res) => {
  res.json(resilience.getAllStats());
});

// Connector test endpoints (bypasses MCP for quick validation)
app.get('/v1/test/connectors', apiKeyAuth(env.MCP_HUB_API_KEY), async (_req, res) => {
  const results: Record<string, { ok: boolean; message: string }> = {};

  // Test Gamma
  if (env.GAMMA_API_KEY) {
    try {
      const response = await fetch('https://public-api.gamma.app/v0.2/themes', {
        headers: { 'X-API-KEY': env.GAMMA_API_KEY },
        signal: AbortSignal.timeout(5000),
      });
      results.gamma = response.ok
        ? { ok: true, message: 'Connected' }
        : { ok: false, message: `HTTP ${response.status}` };
    } catch (e) {
      results.gamma = { ok: false, message: e instanceof Error ? e.message : 'Unknown error' };
    }
  } else {
    results.gamma = { ok: false, message: 'GAMMA_API_KEY not configured' };
  }

  // Test Figma
  if (env.FIGMA_TOKEN) {
    try {
      const response = await fetch('https://api.figma.com/v1/me', {
        headers: { 'X-Figma-Token': env.FIGMA_TOKEN },
        signal: AbortSignal.timeout(5000),
      });
      results.figma = response.ok
        ? { ok: true, message: 'Connected' }
        : { ok: false, message: `HTTP ${response.status}` };
    } catch (e) {
      results.figma = { ok: false, message: e instanceof Error ? e.message : 'Unknown error' };
    }
  } else {
    results.figma = { ok: false, message: 'FIGMA_TOKEN not configured' };
  }

  // Test GitHub
  if (env.GITHUB_TOKEN) {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: { 'Authorization': `token ${env.GITHUB_TOKEN}` },
        signal: AbortSignal.timeout(5000),
      });
      results.github = response.ok
        ? { ok: true, message: 'Connected' }
        : { ok: false, message: `HTTP ${response.status}` };
    } catch (e) {
      results.github = { ok: false, message: e instanceof Error ? e.message : 'Unknown error' };
    }
  } else {
    results.github = { ok: false, message: 'GITHUB_TOKEN not configured' };
  }

  // Test Slack
  if (env.SLACK_BOT_TOKEN) {
    try {
      const response = await fetch('https://slack.com/api/auth.test', {
        headers: { 'Authorization': `Bearer ${env.SLACK_BOT_TOKEN}` },
        signal: AbortSignal.timeout(5000),
      });
      const data = await response.json() as { ok: boolean; error?: string };
      results.slack = data.ok
        ? { ok: true, message: 'Connected' }
        : { ok: false, message: data.error || 'Auth failed' };
    } catch (e) {
      results.slack = { ok: false, message: e instanceof Error ? e.message : 'Unknown error' };
    }
  } else {
    results.slack = { ok: false, message: 'SLACK_BOT_TOKEN not configured' };
  }

  // Confluence - just check if configured
  results.confluence = env.ATLASSIAN_API_TOKEN
    ? { ok: true, message: 'Configured (no quick test available)' }
    : { ok: false, message: 'ATLASSIAN_API_TOKEN not configured' };

  res.json(results);
});

// SSE endpoint
app.get('/v1/sse', apiKeyAuth(env.MCP_HUB_API_KEY), async (req, res) => {
  const transport = new SSEServerTransport('/mcp', res);
  const sessionId = transport.sessionId;
  transports.set(sessionId, transport);
  logger.info('New SSE connection established', { sessionId, activeConnections: transports.size });

  await server.connect(transport);

  transport.onclose = () => {
    logger.info('SSE connection closed', { sessionId, activeConnections: transports.size - 1 });
    transports.delete(sessionId);
  };
});

app.post('/mcp', async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports.get(sessionId);

  if (!transport) {
    logger.warn('No transport found for session', { sessionId });
    res.status(404).send('Session not found');
    return;
  }

  await transport.handlePostMessage(req, res);
});

logger.info('Starting HTTP server...', { port: env.PORT, host: env.HOST });

const httpServer = app.listen(env.PORT, env.HOST, () => {
  const serverStartTime = Date.now() - dbStartTime;
  metrics.markServerListening(serverStartTime);

  logger.info('MCP Hub started', {
    host: env.HOST,
    port: env.PORT,
    endpoint: '/v1/sse',
    version: '0.1.0',
    environment: process.env.NODE_ENV || 'development',
    startupTime: serverStartTime
  });

  // Track connection pool stats periodically (if using PostgreSQL)
  if ('getPoolStats' in store && typeof store.getPoolStats === 'function') {
    setInterval(() => {
      const poolStats = (store as any).getPoolStats();
      metrics.updateConnectionPoolStats(poolStats);
    }, 30000); // Update every 30 seconds
  }
});

// Graceful shutdown handler
const shutdown = async (signal: string) => {
  logger.info('Received shutdown signal', { signal });

  // Stop accepting new connections
  httpServer.close(() => {
    logger.info('HTTP server closed');
  });

  // Close all active SSE connections
  logger.info('Closing SSE connections', { count: transports.size });
  transports.forEach((transport, sessionId) => {
    try {
      transport.close?.();
      logger.debug('SSE connection closed', { sessionId });
    } catch (e) {
      logger.error('Error closing SSE connection', e, { sessionId });
    }
  });
  transports.clear();

  // Give connections time to close
  setTimeout(() => {
    logger.info('Shutdown complete');
    process.exit(0);
  }, 1000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));


// trigger redeploy Fri, Jan 30, 2026 12:26:48 PM
// redeploy for gamma key 1769753575
// redeploy for GH_PAT secret fix 1769847260
