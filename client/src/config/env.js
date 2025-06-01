// Environment configuration for Vite
export const config = {
  // API Configuration
  api: {
    baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    timeout: 10000,
    retryAttempts: 3,
    retryDelay: 1000
  },
  
  // App Configuration
  app: {
    name: 'NBA Live Tracker',
    version: import.meta.env.VITE_APP_VERSION || '0.2.0',
    environment: import.meta.env.VITE_APP_ENV || 'development',
    isDevelopment: import.meta.env.DEV,
    isProduction: import.meta.env.PROD
  },
  
  // Feature Flags
  features: {
    enableDevTools: import.meta.env.DEV,
    enableErrorReporting: import.meta.env.PROD,
    enableAnalytics: import.meta.env.PROD,
    refreshInterval: 5 * 60 * 1000, // 5 minutes
    enableHotReload: import.meta.env.DEV
  },
  
  // UI Configuration
  ui: {
    theme: 'modern',
    animations: true,
    transitions: true,
    debugMode: import.meta.env.DEV
  }
}

// Validation for required environment variables
if (!config.api.baseUrl && config.app.isProduction) {
  console.error('Missing required environment variable: VITE_API_URL')
}

export default config
