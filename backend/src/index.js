// Critical: Start listening IMMEDIATELY to pass Cloud Run health check
// Initialize everything else asynchronously after the port is open

// Align with config/environment.js (4000). Cloud Run always sets PORT.
const PORT = parseInt(process.env.PORT || '4000', 10);

console.log(
  `[INIT] Starting server (PORT=${PORT} NODE_ENV=${process.env.NODE_ENV || 'undefined'})`
);

// Import modules - wrap in try-catch to handle import errors
let app, setupGraphQL, config, logger, closeRedisConnection;
let modulesLoadOk = false;

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
  
  // [INIT] modules ok
  modulesLoadOk = true;
} catch (importError) {
  console.error('[INIT] ❌ Error importing modules:', importError.message);
  console.error('[INIT] Stack:', importError.stack);
  // Create minimal Express app as fallback (still attach CORS so Expo web preflight does not fail opaquely)
  const express = (await import('express')).default;
  const cors = (await import('cors')).default;
  app = express();
  app.use(
    cors({
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    })
  );
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
  server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[INIT] Listening on 0.0.0.0:${PORT}`);
  });
} catch (listenError) {
  console.error('[INIT] ❌ Failed to start server:', listenError);
  process.exit(1);
}

// Now initialize GraphQL and other features asynchronously
(async () => {
  try {
    await setupGraphQL();
    console.log('[INIT] GraphQL ready at /graphql');
  } catch (error) {
    logger.error('Failed to setup GraphQL:', error);
    console.error('[INIT] ❌ GraphQL setup failed:', error.message);
    // Continue - server is already listening
  }
})();

// Graceful shutdown
const shutdown = async () => {
  console.warn('[SHUTDOWN] Graceful shutdown…');

  server.close(async () => {
    try {
      await closeRedisConnection();
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
