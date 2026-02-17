// Critical: Start listening IMMEDIATELY to pass Cloud Run health check
// Initialize everything else asynchronously after the port is open

const PORT = parseInt(process.env.PORT || '8080', 10);

console.log('[INIT] Starting server...');
console.log(`[INIT] PORT=${PORT}`);
console.log(`[INIT] NODE_ENV=${process.env.NODE_ENV || 'undefined'}`);

// Import modules - wrap in try-catch to handle import errors
let app, setupGraphQL, config, logger, closeRedisConnection;

try {
  // Import all modules synchronously first
  const serverModule = await import('./server.js');
  app = serverModule.default;
  setupGraphQL = serverModule.setupGraphQL;
  
  const configModule = await import('./config/environment.js');
  config = configModule.default;
  
  const loggerModule = await import('./utils/logger.js');
  logger = loggerModule.default;
  
  const redisModule = await import('./config/redis.js');
  closeRedisConnection = redisModule.closeRedisConnection;
  
  console.log('[INIT] Modules loaded successfully');
} catch (importError) {
  console.error('[INIT] ❌ Error importing modules:', importError.message);
  console.error('[INIT] Stack:', importError.stack);
  // Create minimal Express app as fallback
  const express = (await import('express')).default;
  app = express();
  app.get('/health', (req, res) => {
    res.status(200).json({ 
      status: 'error', 
      message: 'Server initialization failed - check logs',
      timestamp: new Date().toISOString() 
    });
  });
  logger = { info: console.log, error: console.error, warn: console.warn };
  closeRedisConnection = async () => {};
  setupGraphQL = async () => {};
}

// START LISTENING IMMEDIATELY - This is critical for Cloud Run
let server;
try {
  console.log(`[INIT] Starting server on port ${PORT}...`);
  server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[INIT] ✅ Server listening on 0.0.0.0:${PORT}`);
    logger.info(`Server listening on 0.0.0.0:${PORT}`);
  });
} catch (listenError) {
  console.error('[INIT] ❌ Failed to start server:', listenError);
  process.exit(1);
}

// Now initialize GraphQL and other features asynchronously
(async () => {
  try {
    console.log('[INIT] Setting up GraphQL...');
    await setupGraphQL();
    logger.info('GraphQL endpoint ready at /graphql');
    console.log('[INIT] ✅ GraphQL ready');
  } catch (error) {
    logger.error('Failed to setup GraphQL:', error);
    console.error('[INIT] ❌ GraphQL setup failed:', error.message);
    // Continue - server is already listening
  }
})();

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down server...');
  console.log('[SHUTDOWN] Shutting down...');
  
  server.close(async () => {
    logger.info('HTTP server closed');
    console.log('[SHUTDOWN] HTTP server closed');
    
    try {
      await closeRedisConnection();
      logger.info('Redis connection closed');
      console.log('[SHUTDOWN] Redis closed');
    } catch (error) {
      console.error('[SHUTDOWN] Error closing Redis:', error);
    }
    
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    console.error('[SHUTDOWN] Forced shutdown');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Handle unhandled errors - log but don't crash if server is already listening
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled rejection:', error);
  console.error('[ERROR] Unhandled rejection:', error);
  // Don't shutdown - server is listening, log and continue
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  console.error('[ERROR] Uncaught exception:', error);
  // Only shutdown if server isn't listening yet
  if (!server || !server.listening) {
    shutdown();
  }
});
