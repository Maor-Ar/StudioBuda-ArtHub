import app, { setupGraphQL } from './server.js';
import config from './config/environment.js';
import logger from './utils/logger.js';
import { closeRedisConnection } from './config/redis.js';

const PORT = config.server.port;

// Start server
const startServer = async () => {
  console.log('=== Starting Server ===');
  console.log(`Environment: ${config.server.nodeEnv || 'undefined'}`);
  console.log(`Port: ${PORT}`);
  console.log(`CORS Origin: ${config.cors.origin}`);
  logger.info('=== Starting Server ===');
  logger.info(`Environment: ${config.server.nodeEnv || 'undefined'}`);
  logger.info(`Port: ${PORT}`);
  logger.info(`CORS Origin: ${config.cors.origin}`);
  
  // Setup GraphQL
  await setupGraphQL();

  // Listen on all network interfaces (0.0.0.0) to allow mobile device connections
  const server = app.listen(PORT, '0.0.0.0', () => {
    logger.info('=== Server Started Successfully ===');
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Server listening on all network interfaces (0.0.0.0:${PORT})`);
    logger.info(`GraphQL endpoint: http://localhost:${PORT}/graphql`);
    logger.info(`API docs: http://localhost:${PORT}/api-docs`);
    logger.info(`Health check: http://localhost:${PORT}/health`);
    console.log(`\n📱 Mobile devices can connect using your computer's IP address on port ${PORT}`);
    console.log(`   Example: http://192.168.1.100:${PORT}/graphql\n`);
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

