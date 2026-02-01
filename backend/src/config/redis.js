import { createClient } from 'redis';
import config from './environment.js';
import logger from '../utils/logger.js';

let redisClient = null;
let connectionFailed = false;
let connectionAttemptInProgress = false;

export const getRedisClient = async () => {
  // If we have a working client, return it
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  // If connection previously failed in development, don't retry immediately
  if (connectionFailed && config.server.nodeEnv === 'development') {
    return null;
  }

  // Check if Redis config is available
  if (!config.redis.host) {
    // Redis is an optional cache layer. If it's not configured, just disable cache.
    // (Keeping this non-fatal in production allows small deployments to run without Redis.)
    logger.warn('⚠️  Redis not configured. Cache will be disabled.');
    return null;
  }

  // Prevent multiple simultaneous connection attempts
  if (connectionAttemptInProgress) {
    return null;
  }

  try {
    connectionAttemptInProgress = true;
    
    redisClient = createClient({
      socket: {
        host: config.redis.host,
        port: config.redis.port,
        connectTimeout: 2000, // 2 second timeout
        reconnectStrategy: false, // Don't auto-reconnect
      },
      password: config.redis.password || undefined,
    });

    redisClient.on('error', (err) => {
      logger.error('Redis Client Error:', err);
      connectionFailed = true;
      connectionAttemptInProgress = false;
      redisClient = null;
    });

    redisClient.on('connect', () => {
      logger.info('Redis Client Connected');
      connectionFailed = false;
    });

    redisClient.on('ready', () => {
      logger.info('Redis Client Ready');
      connectionFailed = false;
      connectionAttemptInProgress = false;
    });

    redisClient.on('end', () => {
      logger.info('Redis Client Connection Ended');
      connectionAttemptInProgress = false;
    });

    // Connect with timeout
    await Promise.race([
      redisClient.connect(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Redis connection timeout')), 2000)
      )
    ]);
    
    connectionAttemptInProgress = false;
    return redisClient;
  } catch (error) {
    logger.error('Redis connection error:', error);
    connectionFailed = true;
    connectionAttemptInProgress = false;
    redisClient = null;
    
    const isDevelopment = config.server.nodeEnv === 'development';
    if (isDevelopment) {
      logger.warn('⚠️  Redis connection failed. Continuing without cache.');
      return null;
    }
    // In production, treat Redis as optional: continue without cache instead of crashing.
    logger.warn('⚠️  Redis connection failed in production. Continuing without cache.');
    return null;
  }
};

export const closeRedisConnection = async () => {
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
    redisClient = null;
  }
};

export default getRedisClient;

