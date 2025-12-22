#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { GammaClient } from './gamma-client.js';
import {
  CARD_DIMENSIONS_BY_FORMAT,
  CARD_DIMENSIONS,
  CARD_SPLITS,
  EXPORT_TYPES,
  FORMATS,
  IMAGE_SOURCES,
  OPTION_REFERENCE,
  TEXT_AMOUNTS,
  TEXT_MODES,
  WORKSPACE_ACCESS_LEVELS,
  EXTERNAL_ACCESS_LEVELS,
} from './constants.js';
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const TextModeSchema = z.enum(TEXT_MODES);
const FormatSchema = z.enum(FORMATS);
const TextAmountSchema = z.enum(TEXT_AMOUNTS);
const ImageSourceSchema = z.enum(IMAGE_SOURCES);
const CardSplitSchema = z.enum(CARD_SPLITS);
const ExportTypeSchema = z.enum(EXPORT_TYPES);
const CardDimensionSchema = z.enum(CARD_DIMENSIONS);
const WorkspaceAccessSchema = z.enum(WORKSPACE_ACCESS_LEVELS);
const ExternalAccessSchema = z.enum(EXTERNAL_ACCESS_LEVELS);

const GenerateContentSchema = z
  .object({
    inputText: z
      .string()
      .min(1, 'inputText must contain content')
      .max(750_000, 'inputText exceeds maximum length of 750,000 characters')
      .describe('Text used to generate content'),
    textMode: TextModeSchema.optional().describe('Controls text generation mode'),
    format: FormatSchema.optional().describe('Output format type'),
    themeName: z.string().trim().min(1).optional().describe('Visual theme for the content'),
    numCards: z
      .number()
      .int('numCards must be an integer')
      .min(1)
      .max(75)
      .optional()
      .describe('Number of cards (1-75)'),
    cardSplit: CardSplitSchema.optional().describe('How Gamma should split the content into cards'),
    additionalInstructions: z
      .string()
      .trim()
      .min(1, 'additionalInstructions must not be empty when provided')
      .max(500, 'additionalInstructions must be 500 characters or fewer')
      .optional()
      .describe('Additional creative direction for Gamma'),
    exportAs: z
      .union([
        ExportTypeSchema,
        z.array(ExportTypeSchema).nonempty('exportAs array cannot be empty'),
      ])
      .optional()
      .describe('Additional export formats (pdf, pptx)'),
    textOptions: z
      .object({
        amount: TextAmountSchema.optional(),
        tone: z.string().trim().min(1).max(500).optional(),
        audience: z.string().trim().min(1).max(500).optional(),
        language: z.string().trim().min(2).max(10).optional(),
      })
      .optional()
      .describe('Text generation options'),
    imageOptions: z
      .object({
        source: ImageSourceSchema.optional(),
        model: z.string().trim().min(1).max(100).optional(),
        style: z.string().trim().min(1).max(500).optional(),
      })
      .optional()
      .describe('Image generation options'),
    cardOptions: z
      .object({
        dimensions: CardDimensionSchema.optional(),
      })
      .optional()
      .describe('Card-level display options'),
    sharingOptions: z
      .object({
        workspaceAccess: WorkspaceAccessSchema.optional(),
        externalAccess: ExternalAccessSchema.optional(),
      })
      .optional()
      .describe('Sharing permissions'),
  })
  .superRefine((value, ctx) => {
    if (value.cardOptions?.dimensions && value.format) {
      const allowed = CARD_DIMENSIONS_BY_FORMAT[value.format] as readonly string[] | undefined;
      if (allowed && !allowed.includes(value.cardOptions.dimensions)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `cardOptions.dimensions value "${value.cardOptions.dimensions}" is not valid for format "${value.format}"`,
          path: ['cardOptions', 'dimensions'],
        });
      }
    }

    if (value.additionalInstructions !== undefined && value.additionalInstructions.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'additionalInstructions cannot be an empty string',
        path: ['additionalInstructions'],
      });
    }
  });

const GetStatusSchema = z.object({
  generationId: z.string().trim().min(1, 'generationId is required'),
});

const OPTION_CATEGORIES = [
  'textModes',
  'formats',
  'textAmounts',
  'imageSources',
  'cardSplits',
  'exportTypes',
  'cardDimensions',
  'cardDimensionsByFormat',
  'workspaceAccessLevels',
  'externalAccessLevels',
] as const;

type OptionCategory = (typeof OPTION_CATEGORIES)[number];

const DescribeOptionsSchema = z.object({
  category: z.enum(OPTION_CATEGORIES).optional(),
  format: FormatSchema.optional(),
});

class GammaMcpServer {
  private server: Server;
  private gammaClient: GammaClient;

  constructor() {
    this.server = new Server(
      {
        name: 'gamma-mcp-server',
        version: '1.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    const apiKey = process.env.GAMMA_API_KEY;
    if (!apiKey) {
      throw new Error('GAMMA_API_KEY environment variable is required');
    }

    this.gammaClient = new GammaClient(apiKey);
    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'gamma_generate',
          description:
            'Generate a presentation, document, or social content using Gamma AI with rich configuration support',
          inputSchema: {
            type: 'object',
            properties: {
              inputText: {
                type: 'string',
                description: 'Text used to generate content (1-750k characters)',
              },
              textMode: {
                type: 'string',
                enum: [...TEXT_MODES],
                description: 'Controls text generation mode (default: generate)',
              },
              format: {
                type: 'string',
                enum: [...FORMATS],
                description: 'Output format type (default: presentation)',
              },
              themeName: {
                type: 'string',
                description: 'Visual theme for the content',
              },
              numCards: {
                type: 'number',
                description: 'Number of cards (1-75, default respects environment configuration)',
              },
              cardSplit: {
                type: 'string',
                enum: [...CARD_SPLITS],
                description: 'How Gamma should split the generated content into cards',
              },
              additionalInstructions: {
                type: 'string',
                description: 'Extra guidance for Gamma (max 500 characters)',
              },
              exportAs: {
                anyOf: [
                  {
                    type: 'string',
                    enum: [...EXPORT_TYPES],
                  },
                  {
                    type: 'array',
                    items: {
                      type: 'string',
                      enum: [...EXPORT_TYPES],
                    },
                  },
                ],
                description: 'Optional export targets (pdf, pptx)',
              },
              textOptions: {
                type: 'object',
                properties: {
                  amount: {
                    type: 'string',
                    enum: [...TEXT_AMOUNTS],
                    description: 'Text density per card',
                  },
                  tone: {
                    type: 'string',
                    description: 'Content tone (max 500 characters)',
                  },
                  audience: {
                    type: 'string',
                    description: 'Intended audience description (max 500 characters)',
                  },
                  language: {
                    type: 'string',
                    description: 'ISO language code (see Gamma language docs)',
                  },
                },
              },
              imageOptions: {
                type: 'object',
                properties: {
                  source: {
                    type: 'string',
                    enum: [...IMAGE_SOURCES],
                    description: 'Image origin strategy',
                  },
                  model: {
                    type: 'string',
                    description: 'Preferred AI image model name',
                  },
                  style: {
                    type: 'string',
                    description: 'Stylistic guidance for generated imagery',
                  },
                },
              },
              cardOptions: {
                type: 'object',
                properties: {
                  dimensions: {
                    type: 'string',
                    enum: [...CARD_DIMENSIONS],
                    description: 'Aspect ratio or page size for generated cards',
                  },
                },
              },
              sharingOptions: {
                type: 'object',
                properties: {
                  workspaceAccess: {
                    type: 'string',
                    enum: [...WORKSPACE_ACCESS_LEVELS],
                    description: 'Workspace member permissions',
                  },
                  externalAccess: {
                    type: 'string',
                    enum: [...EXTERNAL_ACCESS_LEVELS],
                    description: 'External sharing permissions',
                  },
                },
              },
            },
            required: ['inputText'],
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
        {
          name: 'gamma_get_status',
          description: 'Check the status of a generation request',
          inputSchema: {
            type: 'object',
            properties: {
              generationId: {
                type: 'string',
                description: 'The ID of the generation to check',
              },
            },
            required: ['generationId'],
          },
        },
        {
          name: 'gamma_describe_options',
          description: 'List accepted option values and defaults supported by the Gamma API',
          inputSchema: {
            type: 'object',
            properties: {
              category: {
                type: 'string',
                enum: [...OPTION_CATEGORIES],
                description: 'Filter to a specific option category',
              },
              format: {
                type: 'string',
                enum: [...FORMATS],
                description: 'Optional filter for cardDimensions/cardDimensionsByFormat',
              },
            },
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;

        switch (name) {
          case 'gamma_generate': {
            const params = GenerateContentSchema.parse(args ?? {});
            const result = await this.gammaClient.generateContent(params);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case 'gamma_get_themes': {
            const themes = await this.gammaClient.getAvailableThemes();
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(themes, null, 2),
                },
              ],
            };
          }

          case 'gamma_get_status': {
            const params = GetStatusSchema.parse(args ?? {});
            const status = await this.gammaClient.getGenerationStatus(params.generationId);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(status, null, 2),
                },
              ],
            };
          }

          case 'gamma_describe_options': {
            const params = DescribeOptionsSchema.parse(args ?? {});
            const reference = GammaClient.getOptionReference();
            const payload = this.buildOptionReferencePayload(params.category, params.format, reference);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(payload, null, 2),
                },
              ],
            };
          }

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `Invalid parameters: ${error.errors
              .map((e) => `${e.path.join('.') || 'root'}: ${e.message}`)
              .join(', ')}`
          );
        }
        throw error;
      }
    });
  }

  private buildOptionReferencePayload(
    category: OptionCategory | undefined,
    format: z.infer<typeof FormatSchema> | undefined,
    reference: typeof OPTION_REFERENCE
  ) {
    if (!category) {
      if (format && reference.cardDimensionsByFormat[format]) {
        return {
          ...reference,
          cardDimensionsFiltered: {
            format,
            values: reference.cardDimensionsByFormat[format],
          },
        };
      }
      return reference;
    }

    if (category === 'cardDimensions' && format && reference.cardDimensionsByFormat[format]) {
      return {
        category,
        format,
        values: reference.cardDimensionsByFormat[format],
      };
    }

    if (category === 'cardDimensionsByFormat' && format && reference.cardDimensionsByFormat[format]) {
      return {
        category,
        format,
        values: reference.cardDimensionsByFormat[format],
      };
    }

    return {
      category,
      values: reference[category],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Gamma MCP server running on stdio');
  }
}

const server = new GammaMcpServer();
server.run().catch(console.error);
