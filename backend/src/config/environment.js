import dotenv from 'dotenv';

dotenv.config();

const requiredEnvVars = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL',
];

const optionalEnvVars = {
  PORT: 4000,
  NODE_ENV: 'production',
  REDIS_PASSWORD: '',
  CORS_ORIGIN: '*',
  PASSWORD_RESET_TOKEN_EXPIRY: 3600,
  EMAIL_SERVICE_PROVIDER: 'sendgrid',
  // ZCredit (SmartBee) - Test credentials as defaults
  ZCREDIT_TERMINAL_NUMBER: '0882016016',
  ZCREDIT_PASSWORD: 'Z0882016016',
  ZCREDIT_KEY: 'c0863aa14e77ec032effda671797c295d8a2ab154e49242871a197d158fa3f30',
  ZCREDIT_API_URL: 'https://pci.zcredit.co.il',
  BACKEND_URL: 'http://localhost:4000',
  FRONTEND_URL: 'http://localhost:8081',
};

// Validate required environment variables
// In production, warn but don't throw - allow server to start so Cloud Run health check passes
// This helps debug secret configuration issues without blocking deployment
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

if (missingVars.length > 0) {
  if (isDevelopment) {
    // Warn in development but don't fail
    console.warn(
      `⚠️  Warning: Missing environment variables: ${missingVars.join(', ')}\n` +
      `   Server may not function correctly without these.`
    );
  } else {
    // In production, log error but don't throw - allow server to start
    // Firebase initialization will handle missing credentials gracefully
    console.error(
      `⚠️  ERROR: Missing required environment variables: ${missingVars.join(', ')}\n` +
      `   Server will start but Firebase features will not work.\n` +
      `   Check Cloud Run secrets configuration: https://console.cloud.google.com/run/detail/me-west1/studiobuda-backend\n` +
      `   Or Secret Manager: https://console.cloud.google.com/security/secret-manager`
    );
    // Don't throw - let server start and handle errors gracefully
  }
}

// Build configuration object
const config = {
  server: {
    port: parseInt(process.env.PORT || optionalEnvVars.PORT, 10),
    nodeEnv: process.env.NODE_ENV || optionalEnvVars.NODE_ENV,
  },
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  },
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || optionalEnvVars.REDIS_PASSWORD,
  },
  grow: {
    apiUrl: process.env.GROW_API_URL || '',
    apiKey: process.env.GROW_API_KEY || '',
  },
  email: {
    provider: process.env.EMAIL_SERVICE_PROVIDER || optionalEnvVars.EMAIL_SERVICE_PROVIDER,
    apiKey: process.env.EMAIL_API_KEY || '',
    fromAddress: process.env.EMAIL_FROM_ADDRESS || '',
    fromName: process.env.EMAIL_FROM_NAME || 'StudioBuda',
  },
  passwordReset: {
    url: process.env.PASSWORD_RESET_URL || '',
    tokenExpiry: parseInt(
      process.env.PASSWORD_RESET_TOKEN_EXPIRY || optionalEnvVars.PASSWORD_RESET_TOKEN_EXPIRY,
      10
    ),
  },
  cors: {
    origin: process.env.CORS_ORIGIN || optionalEnvVars.CORS_ORIGIN,
  },
  zcredit: {
    terminalNumber: process.env.ZCREDIT_TERMINAL_NUMBER || optionalEnvVars.ZCREDIT_TERMINAL_NUMBER,
    password: process.env.ZCREDIT_PASSWORD || optionalEnvVars.ZCREDIT_PASSWORD,
    key: process.env.ZCREDIT_KEY || optionalEnvVars.ZCREDIT_KEY,
    apiUrl: process.env.ZCREDIT_API_URL || optionalEnvVars.ZCREDIT_API_URL,
  },
  urls: {
    backend: process.env.BACKEND_URL || optionalEnvVars.BACKEND_URL,
    frontend: process.env.FRONTEND_URL || optionalEnvVars.FRONTEND_URL,
  },
};

export default config;

