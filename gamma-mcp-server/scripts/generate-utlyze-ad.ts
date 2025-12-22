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
  const maxAttempts = 24;
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
    inputText:
      'Craft a high-converting promo for Utlyze\'s "Open AI Bar"—a weekly drop-in clinic offering free AI consulting every Tuesday from 5-7 PM. Highlight that founders, operators, and marketers can bring real problems to get actionable guidance, emphasize the zero-cost barrier, and create urgency through limited seats. Close with a strong CTA to reserve a stool at the bar.',
    format: 'social',
    cardSplit: 'auto',
    textOptions: {
      amount: 'brief',
      tone: 'energetic',
      audience: 'startup founders and growth teams',
    },
    imageOptions: {
      source: 'aiGenerated',
      style: 'neon cocktail lounge with tech vibes',
    },
    cardOptions: {
      dimensions: '4x5',
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
