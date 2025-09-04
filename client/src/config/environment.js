// Environment Configuration for TPPMS React Frontend

// Helper function to get required environment variables
const getRequiredEnv = (key, description) => {
  const value = import.meta.env[key]
  if (!value) {
    throw new Error(`❌ Missing required environment variable: ${key} (${description})`)
  }
  return value
}

// Helper function to get optional environment variables
const getOptionalEnv = (key, defaultValue) => {
  return import.meta.env[key] || defaultValue
}

// Helper function to parse boolean environment variables
const getBooleanEnv = (key, defaultValue = false) => {
  const value = import.meta.env[key]
  if (value === undefined) return defaultValue
  return value.toLowerCase() === 'true'
}

// Helper function to parse integer environment variables
const getIntegerEnv = (key, defaultValue) => {
  const value = import.meta.env[key]
  if (value === undefined) return defaultValue
  const parsed = parseInt(value)
  if (isNaN(parsed)) {
    throw new Error(`❌ Invalid integer value for ${key}: ${value}`)
  }
  return parsed
}

export const config = {
  // Environment
  environment: getRequiredEnv('MODE', 'Build mode (development/production)'),
  isDevelopment: import.meta.env.MODE === 'development',
  isProduction: import.meta.env.MODE === 'production',
  
  // API Configuration - REQUIRED
  api: {
    baseUrl: getRequiredEnv('VITE_API_BASE_URL', 'Backend API URL'),
    timeout: getIntegerEnv('VITE_API_TIMEOUT', 30000),
  },
  
  // Google OAuth - REQUIRED
  google: {
    clientId: getRequiredEnv('VITE_GOOGLE_CLIENT_ID', 'Google OAuth Client ID'),
    enabled: getBooleanEnv('VITE_ENABLE_GOOGLE_AUTH', true),
  },
  
  // Application Info - REQUIRED
  app: {
    name: getRequiredEnv('VITE_APP_NAME', 'Application name'),
    description: getRequiredEnv('VITE_APP_DESCRIPTION', 'Application description'),
    version: getRequiredEnv('VITE_APP_VERSION', 'Application version'),
  },
  
  // Debug and Logging
  debug: {
    enabled: getBooleanEnv('VITE_DEBUG_MODE', false),
    consoleLogging: getBooleanEnv('VITE_ENABLE_CONSOLE_LOGS', true),
  },
  
  // Session Configuration
  session: {
    timeout: getIntegerEnv('VITE_SESSION_TIMEOUT', 3600000), // 1 hour default
  },
  
  // UI Configuration
  ui: {
    itemsPerPage: getIntegerEnv('VITE_ITEMS_PER_PAGE', 10),
    maxUploadSize: getIntegerEnv('VITE_MAX_UPLOAD_SIZE', 10485760), // 10MB default
  },
  
  // Feature Flags
  features: {
    googleAuth: getBooleanEnv('VITE_ENABLE_GOOGLE_AUTH', true),
    benchSummary: getBooleanEnv('VITE_ENABLE_BENCH_SUMMARY', true),
    allocationModal: getBooleanEnv('VITE_ENABLE_ALLOCATION_MODAL', true),
  }
}

// Debug logging in development
if (config.debug.enabled && config.debug.consoleLogging) {
  console.log('🔧 TPPMS Configuration:', config)
}

export default config
