import axios, { AxiosError, type AxiosInstance } from 'axios';
import http from 'node:http';
import https from 'node:https';
import {
  CARD_DIMENSIONS,
  CARD_DIMENSIONS_BY_FORMAT,
  CARD_SPLITS,
  EXPORT_TYPES,
  FORMATS,
  IMAGE_SOURCES,
  OPTION_REFERENCE,
  TEXT_AMOUNTS,
  TEXT_MODES,
  type CardDimension,
  type CardSplit,
  type ExternalAccessLevel,
  type Format,
  type ImageSource,
  type TextAmount,
  type TextMode,
  type WorkspaceAccessLevel,
  type ExportType,
} from './gamma-constants.js';
import type { Env } from '../config.js';
import type { HubStore } from '../store/types.js';

export interface TextOptionsInput {
  amount?: TextAmount;
  tone?: string;
  audience?: string;
  language?: string;
}

export interface ImageOptionsInput {
  source?: ImageSource;
  model?: string;
  style?: string;
}

export interface CardOptionsInput {
  dimensions?: CardDimension;
}

export interface SharingOptionsInput {
  workspaceAccess?: WorkspaceAccessLevel;
  externalAccess?: ExternalAccessLevel;
}

export interface GenerateContentParams {
  inputText: string;
  textMode?: TextMode;
  format?: Format;
  themeName?: string;
  numCards?: number;
  cardSplit?: CardSplit;
  additionalInstructions?: string;
  exportAs?: ExportType | ExportType[];
  textOptions?: TextOptionsInput;
  imageOptions?: ImageOptionsInput;
  cardOptions?: CardOptionsInput;
  sharingOptions?: SharingOptionsInput;
}

export interface GenerationResponse {
  generationId: string;
  status: string;
  url?: string;
  gammaUrl?: string;
  message?: string;
  error?: string;
  credits?: {
    deducted?: number;
    remaining?: number;
  };
}

export interface Theme {
  id: string;
  name: string;
  description?: string;
  preview?: string;
}

// Reduced timeouts to fail fast - Claude Code MCP client has strict limits
const DEFAULT_TIMEOUT_MS = 10000; // 10s instead of 30s
const STATUS_CHECK_TIMEOUT_MS = 5000; // Fast timeout for status checks
const MAX_NUM_CARDS = 75;

// Theme cache to avoid repeated API calls (themes rarely change)
const THEME_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
let themeCache: { themes: Theme[]; timestamp: number } | null = null;

// Keep-alive agents for connection reuse (reduces latency significantly)
const httpAgent = new http.Agent({ keepAlive: true, timeout: 60000 });
const httpsAgent = new https.Agent({ keepAlive: true, timeout: 60000 });

// Simple retry utility with exponential backoff
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  baseDelayMs: number = 500
): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

export class GammaClient {
  private client: AxiosInstance;

  constructor(apiKey: string) {
    this.client = axios.create({
      baseURL: 'https://public-api.gamma.app/v1.0',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      timeout: DEFAULT_TIMEOUT_MS,
      httpAgent,
      httpsAgent,
    });
  }

  async generateContent(params: GenerateContentParams): Promise<GenerationResponse> {
    try {
      // textMode is required in v1.0 API - default to 'generate' if not provided
      const payload = { ...params, textMode: params.textMode || 'generate' };
      const response = await this.client.post('/generations', payload);
      return {
        generationId: response.data.generationId || response.data.id,
        status: response.data.status || 'submitted',
        url: response.data.url || response.data.gammaUrl,
        gammaUrl: response.data.gammaUrl,
        message: response.data.message || 'Generation request submitted successfully',
        credits: response.data.credits,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return this.handleAxiosError(error);
      }
      throw error;
    }
  }

  async getGenerationStatus(generationId: string): Promise<GenerationResponse> {
    try {
      // Use retry for status checks (safe - idempotent operation)
      const response = await withRetry(
        () => this.client.get(`/generations/${generationId}`, {
          timeout: STATUS_CHECK_TIMEOUT_MS,
        }),
        2, // max 2 retries
        300 // start with 300ms delay
      );
      return {
        generationId,
        status: response.data.status,
        url: response.data.url || response.data.gammaUrl,
        gammaUrl: response.data.gammaUrl,
        message: response.data.message,
        credits: response.data.credits,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        // For timeout errors, return a helpful status instead of throwing
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
          return {
            generationId,
            status: 'checking',
            message: 'Status check timed out - generation may still be in progress. Try again in a few seconds.',
          };
        }
        return this.handleAxiosError(error, generationId);
      }
      throw error;
    }
  }

  async getAvailableThemes(): Promise<Theme[] | { error: string }> {
    // Return cached themes if still valid
    if (themeCache && Date.now() - themeCache.timestamp < THEME_CACHE_TTL_MS) {
      return themeCache.themes;
    }

    try {
      const response = await this.client.get('/themes', {
        timeout: STATUS_CHECK_TIMEOUT_MS,
      });
      const themes = response.data.themes || [];
      // Cache the result
      themeCache = { themes, timestamp: Date.now() };
      return themes;
    } catch (error) {
      // If we have stale cache, return it on error (graceful degradation)
      if (themeCache) {
        return themeCache.themes;
      }
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = (error.response?.data as any)?.message || error.message;
        return { error: `Failed to fetch themes: ${status} - ${message}` };
      }
      return { error: 'Failed to fetch themes' };
    }
  }

  private handleAxiosError(error: AxiosError, generationId?: string): GenerationResponse {
    const status = error.response?.status;
    const message = (error.response?.data as any)?.message || error.message;
    return {
      generationId: generationId ?? '',
      status: 'error',
      error: `API Error ${status}: ${message}`,
    };
  }
}

// Singleton client instance for connection reuse
let gammaClientInstance: GammaClient | null = null;

function getGammaClient(apiKey: string): GammaClient {
  if (!gammaClientInstance) {
    gammaClientInstance = new GammaClient(apiKey);
  }
  return gammaClientInstance;
}

export async function gammaGenerate({
  params,
  store,
  env,
}: {
  params: GenerateContentParams;
  store: HubStore;
  env: Env;
}) {
  if (!env.GAMMA_API_KEY) {
    throw new Error('GAMMA_API_KEY is not configured');
  }
  const client = getGammaClient(env.GAMMA_API_KEY);
  const result = await client.generateContent(params);

  // Don't await artifact creation - do it async to speed up response
  store.createArtifact({
    type: 'gamma_generation',
    name: `Gamma Generation: ${params.inputText.slice(0, 30)}...`,
    source: 'gamma',
    contentType: 'application/json',
    contentText: JSON.stringify(result, null, 2),
    metadata: { params, result },
  }).catch(() => {}); // Ignore artifact storage errors

  return result;
}

export async function gammaGetStatus({
  generationId,
  env,
}: {
  generationId: string;
  env: Env;
}) {
  if (!env.GAMMA_API_KEY) {
    throw new Error('GAMMA_API_KEY is not configured');
  }
  const client = getGammaClient(env.GAMMA_API_KEY);
  return await client.getGenerationStatus(generationId);
}

export async function gammaGetThemes({ env }: { env: Env }) {
  if (!env.GAMMA_API_KEY) {
    throw new Error('GAMMA_API_KEY is not configured');
  }
  const client = getGammaClient(env.GAMMA_API_KEY);
  return await client.getAvailableThemes();
}

