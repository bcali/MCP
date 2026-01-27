import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { logger } from '../utils/logger.js';

// GitHub raw content URL for prompts data
const PROMPTS_DATA_URL = 'https://raw.githubusercontent.com/bcali/prompt-library/main/prompts-data.js';

// Cache for prompts data
let promptsCache: any[] | null = null;
let lastFetch = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface Prompt {
  name: string;
  category: string;
  useCase: string;
  tools?: string | string[];
  techniques?: string | string[];
  description?: string;
  prompt: string;
}

// Fetch and parse prompts data from GitHub
async function getPromptsData(): Promise<Prompt[]> {
  const now = Date.now();

  if (promptsCache && (now - lastFetch) < CACHE_DURATION) {
    return promptsCache;
  }

  try {
    const response = await fetch(PROMPTS_DATA_URL);
    const text = await response.text();

    // Extract JSON from JavaScript file
    const jsonMatch = text.match(/(?:const\s+|window\.)promptsData\s*=\s*(\[[\s\S]*\]);?/);

    if (jsonMatch && jsonMatch[1]) {
      const prompts = JSON.parse(jsonMatch[1]) as Prompt[];
      promptsCache = prompts;
      lastFetch = now;
      logger.info('Loaded prompts from GitHub', { count: prompts.length });
      return prompts;
    }

    throw new Error('Could not parse prompts data from GitHub');
  } catch (error) {
    logger.error('Error fetching prompts from GitHub', error);
    if (promptsCache) {
      return promptsCache;
    }
    return [];
  }
}

// Get unique categories
function getCategories(prompts: Prompt[]): string[] {
  const categories = new Set<string>();
  prompts.forEach(prompt => {
    if (prompt.category) {
      categories.add(prompt.category);
    }
  });
  return Array.from(categories).sort();
}

// Search prompts by query
function searchPrompts(prompts: Prompt[], query: string): Prompt[] {
  const lowerQuery = query.toLowerCase();

  return prompts.filter(prompt => {
    const searchText = [
      prompt.name || '',
      prompt.category || '',
      prompt.useCase || '',
      prompt.description || '',
      Array.isArray(prompt.tools) ? prompt.tools.join(' ') : (prompt.tools || ''),
      Array.isArray(prompt.techniques) ? prompt.techniques.join(' ') : (prompt.techniques || '')
    ].join(' ').toLowerCase();

    return searchText.includes(lowerQuery);
  });
}

// Get prompt by name
function getPromptByName(prompts: Prompt[], name: string): Prompt | undefined {
  const lowerName = name.toLowerCase();

  // Try exact match first
  let match = prompts.find(p =>
    (p.name || '').toLowerCase() === lowerName
  );

  // Try partial match if no exact match
  if (!match) {
    match = prompts.find(p =>
      (p.name || '').toLowerCase().includes(lowerName)
    );
  }

  return match;
}

export const PROMPT_TOOLS: Tool[] = [
  {
    name: 'prompts_search',
    description: 'Search BC Prompt Library by keyword, category, or use case. Returns matching prompts with metadata.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (searches title, category, use case, techniques)',
        },
        category: {
          type: 'string',
          description: 'Optional: Filter by specific category (AI Features, Productivity, PM Artifacts, Discovery, Strategy & Planning, Analytics, Operations, GTM, Career)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'prompts_get',
    description: 'Get the full text of a specific prompt by name. Returns the complete prompt with all details.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Prompt name or partial name to retrieve',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'prompts_list_categories',
    description: 'List all available prompt categories in BC Prompt Library (e.g., AI Features, Productivity, PM Artifacts, etc.)',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

// Handler function for prompts_search
export async function promptsSearch(params: { query: string; category?: string }) {
  const prompts = await getPromptsData();
  let results = prompts;

  // Filter by category if provided
  if (params.category) {
    results = results.filter(p =>
      (p.category || '').toLowerCase() === params.category!.toLowerCase()
    );
  }

  // Search by query
  if (params.query) {
    results = searchPrompts(results, params.query);
  }

  // Format results (limit to 10 for display)
  const formatted = results.slice(0, 10).map(p => ({
    name: p.name,
    category: p.category,
    useCase: p.useCase,
    tools: p.tools,
  }));

  const resultText = `Found ${results.length} prompts:\n\n${JSON.stringify(formatted, null, 2)}\n\nUse prompts_get with the prompt name to see the full text.`;

  return {
    content: [{
      type: 'text' as const,
      text: resultText,
    }],
  };
}

// Handler function for prompts_get
export async function promptsGet(params: { name: string }) {
  const prompts = await getPromptsData();
  const prompt = getPromptByName(prompts, params.name);

  if (!prompt) {
    return {
      content: [{
        type: 'text' as const,
        text: `Prompt not found: "${params.name}"\n\nTry using prompts_search to find available prompts.`,
      }],
    };
  }

  // Format prompt with all details
  const toolsText = prompt.tools
    ? `**Recommended Tools:** ${Array.isArray(prompt.tools) ? prompt.tools.join(', ') : prompt.tools}\n`
    : '';

  const techniquesText = prompt.techniques
    ? `**Techniques:** ${Array.isArray(prompt.techniques) ? prompt.techniques.join(', ') : prompt.techniques}\n`
    : '';

  const promptText = `# ${prompt.name}\n\n**Category:** ${prompt.category}\n**Use Case:** ${prompt.useCase}\n${toolsText}${techniquesText}\n---\n\n${prompt.prompt}`;

  return {
    content: [{
      type: 'text' as const,
      text: promptText,
    }],
  };
}

// Handler function for prompts_list_categories
export async function promptsListCategories() {
  const prompts = await getPromptsData();
  const categories = getCategories(prompts);
  const categoryCounts: Record<string, number> = {};

  prompts.forEach(p => {
    if (p.category) {
      categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
    }
  });

  const formattedCategories = categories.map(cat =>
    `- **${cat}** (${categoryCounts[cat]} prompts)`
  ).join('\n');

  const categoryText = `📚 **BC Prompt Library Categories** (${prompts.length} total prompts):\n\n${formattedCategories}\n\nUse prompts_search with a category name to browse prompts.`;

  return {
    content: [{
      type: 'text' as const,
      text: categoryText,
    }],
  };
}
