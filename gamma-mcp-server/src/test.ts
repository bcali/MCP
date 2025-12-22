import { GammaClient } from './gamma-client.js';
import dotenv from 'dotenv';

dotenv.config();

async function testGammaClient() {
  const apiKey = process.env.GAMMA_API_KEY;
  if (!apiKey) {
    console.error('Please set GAMMA_API_KEY in your .env file');
    process.exit(1);
  }

  const client = new GammaClient(apiKey);

  console.log('Supported option categories:', GammaClient.getOptionReference());
  console.log('Testing Gamma API Client...\n');

  // Test 1: Get available themes
  console.log('1. Getting available themes...');
  try {
    const themes = await client.getAvailableThemes();
    console.log('Available themes:', themes);
  } catch (error) {
    console.error('Error getting themes:', error);
  }

  // Test 2: Generate a simple presentation
  console.log('\n2. Generating a simple presentation...');
  try {
    const result = await client.generateContent({
      inputText: 'Create a 5-slide presentation about the benefits of remote work',
      format: 'presentation',
      numCards: 5,
      cardSplit: 'auto',
      additionalInstructions: 'Focus on hybrid collaboration best practices',
      exportAs: 'pdf',
      textOptions: {
        amount: 'medium',
        tone: 'professional',
        audience: 'business professionals'
      },
      imageOptions: {
        source: 'aiGenerated',
        style: 'modern'
      },
      cardOptions: {
        dimensions: '16x9'
      },
      sharingOptions: {
        workspaceAccess: 'comment',
        externalAccess: 'view'
      }
    });
    console.log('Generation result:', result);

    // Test 3: Check generation status (if we have an ID)
    if (result.generationId) {
      console.log('\n3. Checking generation status...');
      setTimeout(async () => {
        try {
          const status = await client.getGenerationStatus(result.generationId);
          console.log('Generation status:', status);
        } catch (error) {
          console.error('Error checking status:', error);
        }
      }, 2000);
    }
  } catch (error) {
    console.error('Error generating content:', error);
  }
}

testGammaClient().catch(console.error);