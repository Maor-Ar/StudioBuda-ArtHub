import dotenv from 'dotenv';

dotenv.config();

const requiredEnvVars = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL',
  'REDIS_HOST',
  'REDIS_PORT',
];

const optionalEnvVars = {
  PORT: 4000,
  NODE_ENV: 'production',
  REDIS_PASSWORD: '',
  CORS_ORIGIN: '*',
  PASSWORD_RESET_TOKEN_EXPIRY: 3600,
  EMAIL_SERVICE_PROVIDER: 'sendgrid',
};

// Validate required environment variables
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingVars.join(', ')}`
  );
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
};

export default config;

