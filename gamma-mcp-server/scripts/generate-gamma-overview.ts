import dotenv from 'dotenv';
import { GammaClient } from '../src/gamma-client.js';

dotenv.config();

const apiKey = process.env.GAMMA_API_KEY;

if (!apiKey) {
  console.error('GAMMA_API_KEY is required');
  process.exit(1);
}

const client = new GammaClient(apiKey);

async function waitForUrl(generationId: string) {
  const maxAttempts = 36;
  const delayMs = 5000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const status = await client.getGenerationStatus(generationId);
    console.log(`Attempt ${attempt}:`, status);

    if (status.url || status.gammaUrl) {
      return status.url ?? status.gammaUrl ?? '';
    }

    if (status.status === 'failed' || status.status === 'error' || status.status === 'not_found') {
      throw new Error(status.error || `Generation failed with status: ${status.status}`);
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error('Timed out waiting for Gamma to produce a shareable URL');
}

async function main() {
  const result = await client.generateContent({
    inputText: `Craft a Gamma-branded presentation titled "Gamma MCP Launchpad" that walks newcomers through:
1. What the Gamma MCP server does (automated content generation, themes, options catalog, status tracking).
2. How to install and configure it locally (clone repo, npm install, copy .env, add API key, run npm run build/test).
3. How to generate assets, including the social promo for the Utlyze Open AI Bar and how to call scripts/generate-utlyze-ad.ts and scripts/generate-gamma-overview.ts.
4. Where to find the open-source GitHub repository (https://github.com/CryptoJym/gamma-mcp-server) and ways to contribute.
5. A closing slide with a CTA to "Launch your next Gamma in minutes" plus the GitHub URL and Gamma share link placeholder.
Use short, high-impact bullet points, highlight key commands in code-style text, and keep the voice energetic and official.`,
    format: 'presentation',
    cardSplit: 'auto',
    textOptions: {
      amount: 'medium',
      tone: 'professional',
      audience: 'developers and operations teams',
    },
    imageOptions: {
      source: 'aiGenerated',
      style: 'electric purple gradients, neon interface elements, futuristic control room',
    },
    cardOptions: {
      dimensions: '16x9',
    },
    sharingOptions: {
      workspaceAccess: 'comment',
      externalAccess: 'view',
    },
  });

  console.log('Gamma generation submitted:', result);

  if (!result.generationId) {
    throw new Error(result.error || 'No generationId returned from Gamma');
  }

  const url = await waitForUrl(result.generationId);
  console.log('Shareable Gamma URL:', url);
}

main().catch((error) => {
  console.error('Generation failed:', error);
  process.exit(1);
});
