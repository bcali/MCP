import axios, { AxiosError, type AxiosInstance } from 'axios';
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

const DEFAULT_TIMEOUT_MS = 30000;
const MAX_NUM_CARDS = 75;

export class GammaClient {
  private client: AxiosInstance;

  constructor(apiKey: string) {
    this.client = axios.create({
      baseURL: 'https://public-api.gamma.app',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      timeout: DEFAULT_TIMEOUT_MS,
    });
  }

  async generateContent(params: GenerateContentParams): Promise<GenerationResponse> {
    try {
      const response = await this.client.post('/v0.2/generations', params);
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
      const response = await this.client.get(`/v0.2/generations/${generationId}`);
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
        return this.handleAxiosError(error, generationId);
      }
      throw error;
    }
  }

  async getAvailableThemes(): Promise<Theme[]> {
    try {
      const response = await this.client.get('/v0.2/themes');
      return response.data.themes || [];
    } catch {
      return [];
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
  const client = new GammaClient(env.GAMMA_API_KEY);
  const result = await client.generateContent(params);

  await store.createArtifact({
    type: 'gamma_generation',
    name: `Gamma Generation: ${params.inputText.slice(0, 30)}...`,
    source: 'gamma',
    contentType: 'application/json',
    contentText: JSON.stringify(result, null, 2),
    metadata: { params, result },
  });

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
  const client = new GammaClient(env.GAMMA_API_KEY);
  return await client.getGenerationStatus(generationId);
}

export async function gammaGetThemes({ env }: { env: Env }) {
  if (!env.GAMMA_API_KEY) {
    throw new Error('GAMMA_API_KEY is not configured');
  }
  const client = new GammaClient(env.GAMMA_API_KEY);
  return await client.getAvailableThemes();
}

