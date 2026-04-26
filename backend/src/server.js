import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled';
import cors from 'cors';
import helmet from 'helmet';
import { typeDefs } from './graphql/schema/index.js';
import { resolvers } from './graphql/resolvers/index.js';
import { createContext } from './graphql/middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { generalRateLimiter, authRateLimiter } from './middleware/rateLimiter.js';
import config from './config/environment.js';
import logger from './utils/logger.js';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import paymentWebhooks from './routes/webhooks.js';

const app = express();

// Cloud Run / reverse-proxy setup
// Cloud Run forwards requests with X-Forwarded-* headers. express-rate-limit will
// throw if X-Forwarded-For is present but "trust proxy" is not enabled.
// Trust the first proxy hop (recommended for most managed reverse proxies).
app.set('trust proxy', 1);

// Determine environment
const isDevelopment = config.server.nodeEnv === 'development' || !config.server.nodeEnv || config.server.nodeEnv === '';

// CORS - MUST be applied BEFORE other middleware (especially Helmet)
// In development, allow requests from any origin (including mobile devices)
const parseAllowedOrigins = (raw) => {
  if (!raw) return [];
  if (raw === '*') return ['*'];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
};

const buildProductionOrigins = () => {
  const parsed = parseAllowedOrigins(config.cors.origin);
  if (parsed.includes('*')) return parsed;
  const fe = (config.urls?.frontend || '').trim().replace(/\/$/, '');
  if (fe && !parsed.includes(fe)) return [...parsed, fe];
  return parsed;
};

/** Browsers only send these for pages served from the user's machine — safe to allow for local Expo / web dev even when NODE_ENV=production. */
const isLoopbackOrigin = (origin) => {
  if (!origin) return false;
  try {
    const { hostname } = new URL(origin);
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
  } catch {
    return false;
  }
};

const allowedOrigins = isDevelopment
  ? ['*'] // allow all in dev
  : buildProductionOrigins();

// CORS: see allowedOrigins at startup (uncomment to debug CORS in Cloud Logging)
// logger.info('[START] CORS', { isDevelopment, allowedOrigins, corsEnv: process.env.CORS_ORIGIN, nodeEnv: config.server.nodeEnv });
logger.info(
  `[START] CORS ${isDevelopment ? 'dev' : 'prod'} allowedOrigins=${JSON.stringify(allowedOrigins)}`
);

const corsOrigin = (origin, callback) => {
  // Allow requests with no Origin header (mobile apps, server-to-server webhooks, Postman)
  if (!origin) {
    return callback(null, true);
  }

  if (allowedOrigins.includes('*')) {
    return callback(null, origin);
  }

  if (allowedOrigins.includes(origin)) {
    return callback(null, origin);
  }

  if (isLoopbackOrigin(origin)) {
    return callback(null, origin);
  }

  logger.warn('[CORS] Blocked origin', { origin, allowedOrigins });
  return callback(new Error('Not allowed by CORS'));
};

// CORS middleware - MUST be before Helmet and other middleware
app.use(cors({
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Type'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
}));

// Explicit OPTIONS handler for preflight requests
app.options('*', cors({
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
}));

if (isDevelopment) {
  // In development, conditionally apply Helmet without CSP
  app.use(helmet({
    contentSecurityPolicy: false, // Explicitly disable CSP
  }));
  
  // Explicitly remove any CSP headers (in case they were cached)
  app.use((req, res, next) => {
    res.removeHeader('Content-Security-Policy');
    res.removeHeader('X-Content-Security-Policy');
    res.removeHeader('X-WebKit-CSP');
    next();
  });
  
} else {
  // In production, use strict CSP but allow cross-origin API access
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: { policy: 'unsafe-none' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", "https:", "data:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'self'"],
      },
    },
  }));
}
logger.info(
  `[START] Helmet/CSP: ${isDevelopment ? 'CSP off (dev)' : 'CSP on (prod)'}`
);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(requestLogger);

// Rate limiting
app.use('/graphql', generalRateLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Favicon endpoint (to prevent 404 errors)
app.get('/favicon.ico', (req, res) => {
  res.status(204).end(); // No content, but successful
});

// Payment webhooks (ZCredit callbacks)
app.use('/api/payment', paymentWebhooks);

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'StudioBuda ArtHub API',
      version: '1.0.0',
      description: 'GraphQL API for StudioBuda art studio class registration platform',
    },
    servers: [
      {
        url: `http://localhost:${config.server.port}`,
        description: 'Development server',
      },
    ],
  },
  apis: ['./src/graphql/**/*.js', './swagger.yaml'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Apollo Server setup
const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: isDevelopment,
  plugins: isDevelopment ? [] : [ApolloServerPluginLandingPageDisabled()],
  formatError: (formattedError) => {
    // Verbose: logger.debug / logger.error per GraphQL error (uncomment to debug)
    // logger.error('GraphQL', formattedError.message);
    // Preserve AppError.code (e.g. AUTHENTICATION_ERROR) in extensions for the client
    const orig = formattedError.originalError;
    const code =
      (orig && orig.code) ||
      formattedError.extensions?.code ||
      'INTERNAL_ERROR';
    const field = (orig && orig.field) || formattedError.extensions?.field || null;
    return {
      message: formattedError.message,
      extensions: {
        code,
        field,
      },
    };
  },
});

// GraphQL endpoint (will be set up after server starts)
export const setupGraphQL = async () => {
  await apolloServer.start();
  app.use(
    '/graphql',
    expressMiddleware(apolloServer, {
      context: createContext,
    })
  );
};

// Error handler (must be last)
app.use(errorHandler);

export default app;

