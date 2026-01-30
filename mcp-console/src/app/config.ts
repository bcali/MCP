export const config = {
  // Use Cloud Run by default, fallback to localhost for local development
  hubUrl: import.meta.env.VITE_HUB_URL || 'https://mcp-hub-6jzkdzuf2a-uc.a.run.app',
  // API key must be provided via environment variable or updated here
  hubApiKey: import.meta.env.VITE_HUB_API_KEY || 'N0mAdgBaacRse21jxjpaqQuXu/RtmG/ibEb2cNYSNfs',
};

// Warn if using default API key in production
if (config.hubApiKey === 'YOUR_API_KEY_HERE' && config.hubUrl.includes('run.app')) {
  console.error('❌ CRITICAL: Update VITE_HUB_API_KEY environment variable or config.ts with your actual API key');
}

// Log configuration (without exposing full API key)
console.log('📡 MCP Console Configuration:', {
  hubUrl: config.hubUrl,
  apiKeyConfigured: !!config.hubApiKey && config.hubApiKey !== 'YOUR_API_KEY_HERE',
});
