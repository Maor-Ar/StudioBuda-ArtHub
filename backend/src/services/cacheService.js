import getRedisClient from '../config/redis.js';
import { CACHE_TTL } from '../config/constants.js';
import logger from '../utils/logger.js';

// Helper to add timeout to async operations
const withTimeout = async (promise, timeoutMs = 1000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Operation timeout')), timeoutMs)
    )
  ]);
};

class CacheService {
  async get(key) {
    try {
      const client = await withTimeout(getRedisClient(), 1000);
      if (!client) return null; // Cache disabled
      const value = await withTimeout(client.get(key), 500);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      // Silently fail - cache is optional
      return null;
    }
  }

  async set(key, value, ttl = null) {
    try {
      const client = await withTimeout(getRedisClient(), 1000);
      if (!client) return false; // Cache disabled
      const serialized = JSON.stringify(value);
      if (ttl) {
        await withTimeout(client.setEx(key, ttl, serialized), 500);
      } else {
        await withTimeout(client.set(key, serialized), 500);
      }
      return true;
    } catch (error) {
      // Silently fail - cache is optional
      return false;
    }
  }

  async del(key) {
    try {
      const client = await withTimeout(getRedisClient(), 1000);
      if (!client) return false; // Cache disabled
      await withTimeout(client.del(key), 500);
      return true;
    } catch (error) {
      // Silently fail - cache is optional
      return false;
    }
  }

  async delPattern(pattern) {
    try {
      const client = await withTimeout(getRedisClient(), 1000);
      if (!client) return false; // Cache disabled
      const keys = await withTimeout(client.keys(pattern), 500);
      if (keys.length > 0) {
        await withTimeout(client.del(keys), 500);
      }
      return true;
    } catch (error) {
      // Silently fail - cache is optional
      return false;
    }
  }

  async invalidateUserCache(userId) {
    const patterns = [
      `user:${userId}`,
      `user:${userId}:transactions:active`,
      `user:${userId}:registrations:future`,
    ];
    
    for (const pattern of patterns) {
      await this.delPattern(`${pattern}*`);
    }
  }

  // Helper methods for common cache keys
  getUserKey(userId) {
    return `user:${userId}`;
  }

  getEventKey(eventId) {
    return `event:${eventId}`;
  }

  getEventsKey(dateRange) {
    return `events:active:${dateRange}`;
  }

  getUserTransactionsKey(userId) {
    return `user:${userId}:transactions:active`;
  }

  getUserRegistrationsKey(userId) {
    return `user:${userId}:registrations:future`;
  }
}

export default new CacheService();

