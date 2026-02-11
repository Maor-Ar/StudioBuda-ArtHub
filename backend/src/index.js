import app, { setupGraphQL } from './server.js';
import config from './config/environment.js';
import logger from './utils/logger.js';
import { closeRedisConnection } from './config/redis.js';

const PORT = config.server.port;

// Start server - listen FIRST so Cloud Run sees the port quickly, then setup GraphQL
const startServer = async () => {
  console.log('=== Starting Server ===');
  console.log(`Environment: ${config.server.nodeEnv || 'undefined'}`);
  console.log(`Port: ${PORT}`);
  console.log(`CORS Origin: ${config.cors.origin}`);
  logger.info('=== Starting Server ===');
  logger.info(`Port: ${PORT}`);

  // Listen immediately so Cloud Run health check passes (port must be open within timeout)
  const server = app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Server listening on 0.0.0.0:${PORT}`);
    console.log(`Server listening on port ${PORT}`);
  });

  // Setup GraphQL after server is listening (health check works, GraphQL added for subsequent requests)
  await setupGraphQL();
  logger.info('GraphQL endpoint ready at /graphql');

  return server;
};

const server = await startServer();

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down server...');
  
  server.close(async () => {
    logger.info('HTTP server closed');
    
    await closeRedisConnection();
    logger.info('Redis connection closed');
    
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Handle unhandled errors
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled rejection:', error);
  shutdown();
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  shutdown();
});

