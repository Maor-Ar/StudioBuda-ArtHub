import getRedisClient from '../config/redis.js';
import { CACHE_TTL } from '../config/constants.js';
import logger from '../utils/logger.js';

class CacheService {
  async get(key) {
    try {
      const client = await getRedisClient();
      const value = await client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  async set(key, value, ttl = null) {
    try {
      const client = await getRedisClient();
      const serialized = JSON.stringify(value);
      if (ttl) {
        await client.setEx(key, ttl, serialized);
      } else {
        await client.set(key, serialized);
      }
      return true;
    } catch (error) {
      logger.error('Cache set error:', error);
      return false;
    }
  }

  async del(key) {
    try {
      const client = await getRedisClient();
      await client.del(key);
      return true;
    } catch (error) {
      logger.error('Cache del error:', error);
      return false;
    }
  }

  async delPattern(pattern) {
    try {
      const client = await getRedisClient();
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(keys);
      }
      return true;
    } catch (error) {
      logger.error('Cache delPattern error:', error);
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

