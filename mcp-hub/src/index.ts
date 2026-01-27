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

const env = loadEnv();

// Track database connection time
const dbStartTime = Date.now();
let store;
try {
  store = await createStore(env);
  const dbConnectionTime = Date.now() - dbStartTime;
  metrics.markDatabaseConnected(dbConnectionTime);
  logger.info('Database connected', { connectionTime: dbConnectionTime });
} catch (e) {
  const errorMsg = e instanceof Error ? e.message : String(e);
  metrics.recordStartupError(`Database connection failed: ${errorMsg}`);
  logger.error('Failed to connect to database', e);
  throw e;
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


