export const config = {
  hubUrl: import.meta.env.VITE_HUB_URL || 'http://localhost:8080',
  hubApiKey: import.meta.env.VITE_HUB_API_KEY || '',
};

// Throw error if API key is missing in production
if (!config.hubApiKey && config.hubUrl.includes('run.app')) {
  console.warn('⚠️ VITE_HUB_API_KEY not set. Using empty key for development.');
}

