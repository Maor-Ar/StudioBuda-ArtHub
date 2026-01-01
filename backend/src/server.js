import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
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

const app = express();

// Security middleware
// Configure Helmet with CSP that allows Apollo Sandbox in development
const isDevelopment = config.server.nodeEnv === 'development' || !config.server.nodeEnv || config.server.nodeEnv === '';

// Log security configuration (using both console and logger)
console.log('=== Security Configuration ===');
console.log(`NODE_ENV: ${config.server.nodeEnv || 'undefined'}`);
console.log(`isDevelopment: ${isDevelopment}`);
console.log(`CSP enabled: ${!isDevelopment}`);
logger.info('=== Security Configuration ===');
logger.info(`NODE_ENV: ${config.server.nodeEnv || 'undefined'}`);
logger.info(`isDevelopment: ${isDevelopment}`);
logger.info(`CSP enabled: ${!isDevelopment}`);

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
  
  console.log('CSP disabled in development mode - Apollo Sandbox should work');
  logger.info('CSP disabled in development mode - Apollo Sandbox should work');
} else {
  // In production, use strict CSP
  app.use(helmet({
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
  
  console.log('CSP enabled in production mode with strict rules');
  logger.info('CSP enabled in production mode with strict rules');
}

// CORS
// In development, allow requests from any origin (including mobile devices)
const corsOrigin = isDevelopment 
  ? (origin, callback) => {
      // Allow requests with no origin (like mobile apps, Postman, etc.)
      if (!origin) {
        console.log('[CORS] ✅ Allowing request with no origin (mobile app)');
        return callback(null, true);
      }
      
      // Allow localhost origins
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:8081',
        'http://localhost:19006', // Expo web
        'http://127.0.0.1:3000',
        'http://127.0.0.1:8081',
        'http://127.0.0.1:19006',
      ];
      
      // In development, allow all origins (including mobile device IPs)
      console.log('[CORS] 📱 Allowing request from origin:', origin);
      callback(null, true);
    }
  : config.cors.origin;

app.use(cors({
  origin: corsOrigin,
  credentials: true,
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
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
  introspection: true, // Enable introspection for GraphQL playground/sandbox
  formatError: (error) => {
    logger.error('GraphQL Error:', error);
    return {
      message: error.message,
      code: error.extensions?.code || 'INTERNAL_ERROR',
      field: error.extensions?.field || null,
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

