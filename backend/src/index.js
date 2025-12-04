import app, { setupGraphQL } from './server.js';
import config from './config/environment.js';
import logger from './utils/logger.js';
import { closeRedisConnection } from './config/redis.js';

const PORT = config.server.port;

// Start server
const startServer = async () => {
  // Setup GraphQL
  await setupGraphQL();

  const server = app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`GraphQL endpoint: http://localhost:${PORT}/graphql`);
    logger.info(`API docs: http://localhost:${PORT}/api-docs`);
  });

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

