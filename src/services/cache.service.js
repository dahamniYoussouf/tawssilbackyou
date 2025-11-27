import NodeCache from 'node-cache';

// Handle both CommonJS and ES modules
let Cache;
try {
  Cache = NodeCache.default || NodeCache;
} catch (e) {
  Cache = NodeCache;
}

/**
 * Cache Service
 * Provides in-memory caching with optional Redis support
 * 
 * Features:
 * - In-memory cache (default)
 * - TTL (Time To Live) support
 * - Cache invalidation
 * - Statistics
 */

class CacheService {
  constructor() {
    // Default TTL: 5 minutes
    this.defaultTTL = 300;
    
    // Initialize in-memory cache
    this.cache = new Cache({
      stdTTL: this.defaultTTL,
      checkperiod: 60, // Check for expired keys every 60 seconds
      useClones: false, // Better performance, but be careful with object mutations
      deleteOnExpire: true,
      enableLegacyCallbacks: false
    });

    // Cache statistics
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };

    // Redis client (optional, for production)
    this.redisClient = null;
    this.useRedis = process.env.REDIS_URL && process.env.USE_REDIS === 'true';

    if (this.useRedis) {
      this.initRedis();
    }
  }

  /**
   * Initialize Redis connection (optional)
   */
  async initRedis() {
    try {
      const redis = await import('redis');
      this.redisClient = redis.createClient({
        url: process.env.REDIS_URL
      });

      this.redisClient.on('error', (err) => {
        console.error('Redis Client Error:', err);
        // Fallback to in-memory cache
        this.useRedis = false;
      });

      await this.redisClient.connect();
      console.log('✅ Redis cache connected');
    } catch (error) {
      console.warn('⚠️ Redis not available, using in-memory cache:', error.message);
      this.useRedis = false;
    }
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any|null>} - Cached value or null
   */
  async get(key) {
    try {
      let value = null;

      if (this.useRedis && this.redisClient) {
        const cached = await this.redisClient.get(key);
        if (cached) {
          value = JSON.parse(cached);
          this.stats.hits++;
          return value;
        }
      } else {
        value = this.cache.get(key);
        if (value !== undefined) {
          this.stats.hits++;
          return value;
        }
      }

      this.stats.misses++;
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds (optional)
   * @returns {Promise<boolean>} - Success status
   */
  async set(key, value, ttl = null) {
    try {
      const cacheTTL = ttl || this.defaultTTL;

      if (this.useRedis && this.redisClient) {
        await this.redisClient.setEx(key, cacheTTL, JSON.stringify(value));
      } else {
        this.cache.set(key, value, cacheTTL);
      }

      this.stats.sets++;
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} - Success status
   */
  async del(key) {
    try {
      if (this.useRedis && this.redisClient) {
        await this.redisClient.del(key);
      } else {
        this.cache.del(key);
      }

      this.stats.deletes++;
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Delete multiple keys matching a pattern
   * @param {string} pattern - Pattern to match (e.g., 'stats:*')
   * @returns {Promise<number>} - Number of keys deleted
   */
  async delPattern(pattern) {
    try {
      let count = 0;

      if (this.useRedis && this.redisClient) {
        const keys = await this.redisClient.keys(pattern);
        if (keys.length > 0) {
          await this.redisClient.del(keys);
          count = keys.length;
        }
      } else {
        const keys = this.cache.keys();
        const matchingKeys = keys.filter(key => {
          // Simple pattern matching (supports * wildcard)
          const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
          return regex.test(key);
        });

        matchingKeys.forEach(key => {
          this.cache.del(key);
          count++;
        });
      }

      this.stats.deletes += count;
      return count;
    } catch (error) {
      console.error('Cache delPattern error:', error);
      return 0;
    }
  }

  /**
   * Clear all cache
   * @returns {Promise<boolean>} - Success status
   */
  async flush() {
    try {
      if (this.useRedis && this.redisClient) {
        await this.redisClient.flushDb();
      } else {
        this.cache.flushAll();
      }

      return true;
    } catch (error) {
      console.error('Cache flush error:', error);
      return false;
    }
  }

  /**
   * Check if key exists
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} - Exists status
   */
  async has(key) {
    try {
      if (this.useRedis && this.redisClient) {
        const exists = await this.redisClient.exists(key);
        return exists === 1;
      } else {
        return this.cache.has(key);
      }
    } catch (error) {
      console.error('Cache has error:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} - Cache statistics
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? ((this.stats.hits / total) * 100).toFixed(2) : 0;

    return {
      ...this.stats,
      total,
      hitRate: `${hitRate}%`,
      type: this.useRedis ? 'Redis' : 'In-Memory',
      keys: this.useRedis ? null : this.cache.keys().length
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
  }
}

// Export singleton instance
export default new CacheService();

