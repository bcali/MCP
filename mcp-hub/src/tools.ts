import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { Env } from './config.js';
import type { HubStore } from './store/types.js';
import { generateEventId } from './utils/id.js';
import { ResilienceRegistry, withTimeout } from './utils/resilience.js';
import { figmaImport } from './tools/figma.js';
import { githubCreatePullRequest, githubPutFile } from './tools/github.js';
import { slackPostMessage } from './tools/slack.js';
import { confluenceUpsertPage } from './tools/confluence.js';
import { gammaGenerate, gammaGetStatus, gammaGetThemes } from './tools/gamma.js';
import {
  TEXT_MODES,
  FORMATS,
  TEXT_AMOUNTS,
  IMAGE_SOURCES,
  CARD_SPLITS,
  EXPORT_TYPES,
  CARD_DIMENSIONS,
} from './tools/gamma-constants.js';

export const STATIC_TOOLS: Tool[] = [
  {
    name: 'memory_put',
    description: 'Store shared memory (notes/requirements/decisions) centrally in the hub',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string' },
        value: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        source: { type: 'string', description: 'Origin of the event' },
        source_event_id: { type: 'string', description: 'Original ID from the source' },
      },
      required: ['key', 'value'],
    },
  },
  {
    name: 'memory_get',
    description: 'Fetch a shared memory item by key',
    inputSchema: {
      type: 'object',
      properties: { key: { type: 'string' } },
      required: ['key'],
    },
  },
  {
    name: 'memory_search',
    description: 'Search shared memory by query and/or tags',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
      },
    },
  },
  {
    name: 'artifact_create',
    description: 'Create an artifact record (design export, generated doc, code patch, etc.)',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string' },
        name: { type: 'string' },
        source: { type: 'string' },
        contentType: { type: 'string' },
        contentText: { type: 'string' },
        metadata: { type: 'object' },
        source: { type: 'string', description: 'Origin of the event' },
        source_event_id: { type: 'string', description: 'Original ID from the source' },
      },
      required: ['type'],
    },
  },
  {
    name: 'artifact_get',
    description: 'Get a single artifact by id',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  },
  {
    name: 'artifact_list',
    description: 'List artifacts, optionally filtered by type',
    inputSchema: {
      type: 'object',
      properties: { type: { type: 'string' } },
    },
  },
  {
    name: 'link_add',
    description: 'Add a typed link between two entities (Figma↔PR, Jira↔Confluence, etc.)',
    inputSchema: {
      type: 'object',
      properties: {
        from: {
          type: 'object',
          properties: { type: { type: 'string' }, id: { type: 'string' } },
          required: ['type', 'id'],
        },
        to: {
          type: 'object',
          properties: { type: { type: 'string' }, id: { type: 'string' } },
          required: ['type', 'id'],
        },
        label: { type: 'string' },
        url: { type: 'string' },
        source: { type: 'string', description: 'Origin of the event' },
        source_event_id: { type: 'string', description: 'Original ID from the source' },
      },
      required: ['from', 'to'],
    },
  },
  {
    name: 'link_list',
    description: 'List links, optionally filtered by endpoints',
    inputSchema: {
      type: 'object',
      properties: {
        fromType: { type: 'string' },
        fromId: { type: 'string' },
        toType: { type: 'string' },
        toId: { type: 'string' },
      },
    },
  },
  {
    name: 'run_start',
    description: 'Start a workflow run (useful for multi-step automation and traceability)',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        source: { type: 'string' },
        source_event_id: { type: 'string' },
      },
      required: ['name'],
    },
  },
  {
    name: 'run_step',
    description: 'Append a step to a run log',
    inputSchema: {
      type: 'object',
      properties: {
        runId: { type: 'string' },
        kind: { type: 'string', enum: ['note', 'tool_call', 'artifact', 'link'] },
        message: { type: 'string' },
        data: { type: 'object' },
        source: { type: 'string' },
        source_event_id: { type: 'string' },
      },
      required: ['runId', 'kind', 'message'],
    },
  },
  {
    name: 'run_complete',
    description: 'Mark a run completed or failed',
    inputSchema: {
      type: 'object',
      properties: {
        runId: { type: 'string' },
        status: { type: 'string', enum: ['completed', 'failed'] },
      },
      required: ['runId', 'status'],
    },
  },
  // Connectors (initial set)
  {
    name: 'figma_import',
    description: 'Import basic metadata for a Figma file and store it as an artifact',
    inputSchema: {
      type: 'object',
      properties: {
        fileKey: { type: 'string' },
      },
      required: ['fileKey'],
    },
  },
  {
    name: 'github_put_file',
    description: 'Create or update a file in a GitHub repo (uses GITHUB_TOKEN)',
    inputSchema: {
      type: 'object',
      properties: {
        owner: { type: 'string' },
        repo: { type: 'string' },
        path: { type: 'string' },
        content: { type: 'string', description: 'Raw file contents (UTF-8). Will be base64-encoded by the hub.' },
        message: { type: 'string' },
        branch: { type: 'string' },
      },
      required: ['owner', 'repo', 'path', 'content', 'message', 'branch'],
    },
  },
  {
    name: 'github_create_pr',
    description: 'Create a GitHub pull request (uses GITHUB_TOKEN)',
    inputSchema: {
      type: 'object',
      properties: {
        owner: { type: 'string' },
        repo: { type: 'string' },
        head: { type: 'string' },
        base: { type: 'string' },
        title: { type: 'string' },
        body: { type: 'string' },
      },
      required: ['owner', 'repo', 'head', 'base', 'title'],
    },
  },
  {
    name: 'confluence_upsert_page',
    description: 'Create or update a Confluence page by title (uses Atlassian API token)',
    inputSchema: {
      type: 'object',
      properties: {
        spaceKey: { type: 'string' },
        title: { type: 'string' },
        bodyHtml: { type: 'string', description: 'HTML body' },
      },
      required: ['spaceKey', 'title', 'bodyHtml'],
    },
  },
  {
    name: 'slack_post_message',
    description: 'Post a message to Slack (uses SLACK_BOT_TOKEN)',
    inputSchema: {
      type: 'object',
      properties: {
        channel: { type: 'string' },
        text: { type: 'string' },
      },
      required: ['channel', 'text'],
    },
  },
  {
    name: 'gamma_generate',
    description: 'Generate a presentation, document, or social content using Gamma AI',
    inputSchema: {
      type: 'object',
      properties: {
        inputText: { type: 'string' },
        textMode: { type: 'string', enum: [...TEXT_MODES] },
        format: { type: 'string', enum: [...FORMATS] },
        themeName: { type: 'string' },
        numCards: { type: 'number' },
        cardSplit: { type: 'string', enum: [...CARD_SPLITS] },
        additionalInstructions: { type: 'string' },
        exportAs: {
          anyOf: [
            { type: 'string', enum: [...EXPORT_TYPES] },
            { type: 'array', items: { type: 'string', enum: [...EXPORT_TYPES] } },
          ],
        },
        textOptions: {
          type: 'object',
          properties: {
            amount: { type: 'string', enum: [...TEXT_AMOUNTS] },
            tone: { type: 'string' },
            audience: { type: 'string' },
            language: { type: 'string' },
          },
        },
        imageOptions: {
          type: 'object',
          properties: {
            source: { type: 'string', enum: [...IMAGE_SOURCES] },
            model: { type: 'string' },
            style: { type: 'string' },
          },
        },
        cardOptions: {
          type: 'object',
          properties: {
            dimensions: { type: 'string', enum: [...CARD_DIMENSIONS] },
          },
        },
      },
      required: ['inputText'],
    },
  },
  {
    name: 'gamma_get_status',
    description: 'Check the status of a Gamma generation request',
    inputSchema: {
      type: 'object',
      properties: {
        generationId: { type: 'string' },
      },
      required: ['generationId'],
    },
  },
  {
    name: 'gamma_get_themes',
    description: 'Get available themes for Gamma presentations',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

export function registerTools(server: Server, store: HubStore, env: Env) {
  const resilience = new ResilienceRegistry();

  const MemoryPutSchema = z.object({
    key: z.string().trim().min(1),
    value: z.string().min(1),
    tags: z.array(z.string().trim().min(1)).optional(),
    source: z.string().optional(),
    source_event_id: z.string().optional(),
  });

  const MemoryGetSchema = z.object({
    key: z.string().trim().min(1),
  });

  const MemorySearchSchema = z.object({
    query: z.string().default(''),
    tags: z.array(z.string().trim().min(1)).optional(),
  });

  const ArtifactCreateSchema = z.object({
    type: z.string().trim().min(1),
    name: z.string().trim().min(1).optional(),
    source: z.string().trim().min(1).optional(),
    contentType: z.string().trim().min(1).optional(),
    contentText: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    source_event_id: z.string().optional(),
  });

  const ArtifactGetSchema = z.object({
    id: z.string().trim().min(1),
  });

  const ArtifactListSchema = z.object({
    type: z.string().trim().min(1).optional(),
  });

  const LinkAddSchema = z.object({
    from: z.object({ type: z.string().trim().min(1), id: z.string().trim().min(1) }),
    to: z.object({ type: z.string().trim().min(1), id: z.string().trim().min(1) }),
    label: z.string().trim().min(1).optional(),
    url: z.string().trim().min(1).optional(),
    source: z.string().optional(),
    source_event_id: z.string().optional(),
  });

  const LinkListSchema = z.object({
    fromType: z.string().trim().min(1).optional(),
    fromId: z.string().trim().min(1).optional(),
    toType: z.string().trim().min(1).optional(),
    toId: z.string().trim().min(1).optional(),
  });

  const RunStartSchema = z.object({
    name: z.string().trim().min(1),
    source: z.string().optional(),
    source_event_id: z.string().optional(),
  });

  const RunStepSchema = z.object({
    runId: z.string().trim().min(1),
    kind: z.enum(['note', 'tool_call', 'artifact', 'link']),
    message: z.string().min(1),
    data: z.record(z.string(), z.unknown()).optional(),
    source: z.string().optional(),
    source_event_id: z.string().optional(),
  });

  const RunCompleteSchema = z.object({
    runId: z.string().trim().min(1),
    status: z.enum(['completed', 'failed']),
  });

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools = [...STATIC_TOOLS];
    
    try {
      const connections = await store.listConnections();
      for (const conn of connections) {
        if (conn.enabled && conn.type === 'SSE MCP Server') {
          // For now, we just indicate in the description that more tools are available via this connection
          // A full proxying implementation would fetch and merge them here.
        }
      }
    } catch (e) {
      console.error('[mcp-hub] Error fetching dynamic tools:', e);
    }

    return { tools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    // Determine connector for isolation (blast radius control)
    const connectorId = name.includes('_') ? name.split('_')[0] : 'core';
    const breaker = resilience.getBreaker(connectorId);
    const bulkhead = resilience.getBulkhead(connectorId);

    if (breaker.isOpen()) {
      throw new McpError(
        ErrorCode.InternalError,
        `Connector '${connectorId}' is temporarily unavailable (Circuit Breaker OPEN). Please try again later.`
      );
    }

    try {
      const result = await bulkhead.execute(async () => {
        return await withTimeout(
          (async () => {
            switch (name) {
              case 'memory_put': {
                const p = MemoryPutSchema.parse(args ?? {});
                const eventId = (p.source && p.source_event_id) ? generateEventId(p.source as string, p.source_event_id as string) : undefined;
                const item = await store.upsertMemory(p.key, p.value, p.tags ?? [], eventId);
                return { content: [{ type: 'text', text: JSON.stringify(item, null, 2) }] };
              }
              case 'memory_get': {
                const p = MemoryGetSchema.parse(args ?? {});
                const item = await store.getMemory(p.key);
                return { content: [{ type: 'text', text: JSON.stringify(item ?? null, null, 2) }] };
              }
              case 'memory_search': {
                const p = MemorySearchSchema.parse(args ?? {});
                const results = await store.searchMemory(p.query, p.tags);
                return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
              }
              case 'artifact_create': {
                const p = ArtifactCreateSchema.parse(args ?? {});
                const eventId = (p.source && p.source_event_id) ? generateEventId(p.source as string, p.source_event_id as string) : undefined;
                const artifact = await store.createArtifact({ ...p, eventId });
                return { content: [{ type: 'text', text: JSON.stringify(artifact, null, 2) }] };
              }
              case 'artifact_get': {
                const p = ArtifactGetSchema.parse(args ?? {});
                const artifact = await store.getArtifact(p.id);
                return { content: [{ type: 'text', text: JSON.stringify(artifact ?? null, null, 2) }] };
              }
              case 'artifact_list': {
                const p = ArtifactListSchema.parse(args ?? {});
                const artifacts = await store.listArtifacts(p.type);
                return { content: [{ type: 'text', text: JSON.stringify(artifacts, null, 2) }] };
              }
              case 'link_add': {
                const p = LinkAddSchema.parse(args ?? {});
                const eventId = (p.source && p.source_event_id) ? generateEventId(p.source as string, p.source_event_id as string) : undefined;
                const link = await store.addLink({ ...p, eventId });
                return { content: [{ type: 'text', text: JSON.stringify(link, null, 2) }] };
              }
              case 'link_list': {
                const p = LinkListSchema.parse(args ?? {});
                const links = await store.listLinks(p);
                return { content: [{ type: 'text', text: JSON.stringify(links, null, 2) }] };
              }
              case 'run_start': {
                const p = RunStartSchema.parse(args ?? {});
                const eventId = (p.source && p.source_event_id) ? generateEventId(p.source as string, p.source_event_id as string) : undefined;
                const run = await store.startRun(p.name, eventId);
                return { content: [{ type: 'text', text: JSON.stringify(run, null, 2) }] };
              }
              case 'run_step': {
                const p = RunStepSchema.parse(args ?? {});
                const eventId = (p.source && p.source_event_id) ? generateEventId(p.source as string, p.source_event_id as string) : undefined;
                const step = await store.addRunStep(p.runId, { kind: p.kind, message: p.message, data: p.data, eventId });
                return { content: [{ type: 'text', text: JSON.stringify(step, null, 2) }] };
              }
              case 'run_complete': {
                const p = RunCompleteSchema.parse(args ?? {});
                const run = await store.completeRun(p.runId, p.status);
                return { content: [{ type: 'text', text: JSON.stringify(run, null, 2) }] };
              }

              // Connectors
              case 'figma_import': {
                const fileKey = z.object({ fileKey: z.string().trim().min(1) }).parse(args ?? {}).fileKey;
                const result = await figmaImport({ fileKey, store, env });
                return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
              }
              case 'github_put_file': {
                const p = z
                  .object({
                    owner: z.string().trim().min(1),
                    repo: z.string().trim().min(1),
                    path: z.string().trim().min(1),
                    content: z.string(),
                    message: z.string().trim().min(1),
                    branch: z.string().trim().min(1),
                  })
                  .parse(args ?? {});
                const result = await githubPutFile({ ...p, store, env });
                return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
              }
              case 'github_create_pr': {
                const p = z
                  .object({
                    owner: z.string().trim().min(1),
                    repo: z.string().trim().min(1),
                    head: z.string().trim().min(1),
                    base: z.string().trim().min(1),
                    title: z.string().trim().min(1),
                    body: z.string().optional(),
                  })
                  .parse(args ?? {});
                const result = await githubCreatePullRequest({ ...p, store, env });
                return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
              }
              case 'confluence_upsert_page': {
                const p = z
                  .object({
                    spaceKey: z.string().trim().min(1),
                    title: z.string().trim().min(1),
                    bodyHtml: z.string().min(1),
                  })
                  .parse(args ?? {});
                const result = await confluenceUpsertPage({ ...p, store, env });
                return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
              }
              case 'slack_post_message': {
                const p = z
                  .object({
                    channel: z.string().trim().min(1),
                    text: z.string().min(1),
                  })
                  .parse(args ?? {});
                const result = await slackPostMessage({ ...p, store, env });
                return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
              }

              // Gamma
              case 'gamma_generate': {
                const result = await gammaGenerate({ params: args as any, store, env });
                return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
              }
              case 'gamma_get_status': {
                const { generationId } = z.object({ generationId: z.string() }).parse(args ?? {});
                const result = await gammaGetStatus({ generationId, env });
                return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
              }
              case 'gamma_get_themes': {
                const result = await gammaGetThemes({ env });
                return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
              }

              default:
                throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
            }
          })(),
          15000, // 15s hard timeout
          `Tool execution for '${name}' timed out after 15s`
        );
      });

      breaker.recordSuccess();
      return result;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Invalid parameters: ${error.issues.map((e) => `${e.path.join('.') || 'root'}: ${e.message}`).join(', ')}`
        );
      }
      
      // Record failure for the circuit breaker
      breaker.recordFailure();

      if (error instanceof McpError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new McpError(ErrorCode.InternalError, message);
    }
  });
}


