import dotenv from 'dotenv';
import { loadGmailOAuthClientJson, buildGmailConfig } from './gmailFromEnv.js';

dotenv.config();

const gmailJson = loadGmailOAuthClientJson();
const gmail = buildGmailConfig(gmailJson);
const hasSendGridCreds = !!(
  (process.env.EMAIL_API_KEY || '').trim() && (process.env.EMAIL_FROM_ADDRESS || '').trim()
);
const explicitEmailProvider = (process.env.EMAIL_SERVICE_PROVIDER || '').trim().toLowerCase();
// Template often sets "sendgrid" in secrets without EMAIL_API_KEY; treat as Gmail if OAuth is complete.
const emailProvider = explicitEmailProvider
  ? explicitEmailProvider === 'sendgrid' && !hasSendGridCreds && gmail.isReady
    ? 'gmail'
    : explicitEmailProvider
  : hasSendGridCreds
    ? 'sendgrid'
    : gmail.isReady
      ? 'gmail'
      : 'sendgrid';

const requiredEnvVars = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL',
];

const optionalEnvVars = {
  PORT: 4000,
  // Default to development when unset so local runs get permissive CORS and CSP-off;
  // production deployments must set NODE_ENV=production (e.g. Cloud Run does).
  NODE_ENV: 'development',
  REDIS_PASSWORD: '',
  CORS_ORIGIN: '*',
  PASSWORD_RESET_TOKEN_EXPIRY: 3600,
  EMAIL_SERVICE_PROVIDER: 'sendgrid',
  HYP_API_URL: 'https://pay.hyp.co.il/p/',
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
    provider: emailProvider,
    providerExplicit: Boolean(explicitEmailProvider),
    apiKey: process.env.EMAIL_API_KEY || '',
    fromAddress: process.env.EMAIL_FROM_ADDRESS || '',
    fromName: process.env.EMAIL_FROM_NAME || 'StudioBuda',
    gmail,
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
  hyp: {
    apiUrl: process.env.HYP_API_URL || optionalEnvVars.HYP_API_URL,
    masof: process.env.HYP_MASOF || '',
    key: process.env.HYP_KEY || '',
    passP: process.env.HYP_PASSP || '',
  },
  urls: {
    backend: process.env.BACKEND_URL || optionalEnvVars.BACKEND_URL,
    frontend: process.env.FRONTEND_URL || optionalEnvVars.FRONTEND_URL,
  },
};

export default config;

