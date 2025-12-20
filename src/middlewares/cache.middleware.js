import cacheService from '../services/cache.service.js';
import crypto from 'crypto';

const serializeQuery = (query = {}) => {
  const entries = [];

  Object.entries(query).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => entries.push([key, item]));
      return;
    }

    entries.push([key, value]);
  });

  entries.sort(([keyA, valueA], [keyB, valueB]) => {
    const keyCompare = keyA.localeCompare(keyB);
    if (keyCompare !== 0) return keyCompare;
    return String(valueA ?? '').localeCompare(String(valueB ?? ''));
  });

  return entries.map(([key, value]) => `${key}=${value ?? ''}`).join('&');
};

const buildDefaultCacheKey = (req) => {
  const pathname = `${req.baseUrl || ''}${req.path || ''}` || req.originalUrl || req.url;
  const queryHash = crypto
    .createHash('md5')
    .update(serializeQuery(req.query))
    .digest('hex');
  const userTag = req.user?.id ? `user:${req.user.id}` : 'user:anonymous';

  return `cache:${req.method}:${pathname}:${userTag}:q:${queryHash}`;
};

/**
 * Cache Middleware
 * Automatically caches GET requests based on URL and query parameters
 * 
 * @param {Object} options - Cache options
 * @param {number} options.ttl - Time to live in seconds (default: 300)
 * @param {boolean} options.skipCache - Skip cache if query param is present
 * @param {Function} options.keyGenerator - Custom key generator function
 * @param {Function} options.shouldCache - Function to determine if response should be cached
 */
export const cacheMiddleware = (options = {}) => {
  const {
    ttl = 300, // 5 minutes default
    skipCache = 'nocache', // Query param to skip cache
    keyGenerator = null,
    shouldCache = null,
    debugHeader = true
  } = options;

  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip cache if nocache query param is present
    if (req.query[skipCache] === 'true') {
      return next();
    }

    // Check if should cache this request
    if (shouldCache && !shouldCache(req)) {
      return next();
    }

    // Generate cache key
    let cacheKey;
    if (keyGenerator) {
      cacheKey = keyGenerator(req);
    } else {
      cacheKey = buildDefaultCacheKey(req);
    }

    // Try to get from cache
    const cached = await cacheService.get(cacheKey);
    if (cached !== null) {
      if (debugHeader) {
        res.set('X-Cache', 'HIT');
      }
      return res.status(200).json(cached);
    }

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to cache response
    res.json = function (data) {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        if (debugHeader) {
          res.set('X-Cache', 'MISS');
        }
        // Cache the response asynchronously (don't block response)
        cacheService.set(cacheKey, data, ttl).catch(err => {
          console.error('Cache set error in middleware:', err);
        });
      }

      // Call original json method
      return originalJson(data);
    };

    next();
  };
};

/**
 * Cache invalidation middleware
 * Clears cache when data is modified (POST, PUT, PATCH, DELETE)
 */
export const invalidateCache = (patterns = []) => {
  return async (req, res, next) => {
    // Only invalidate on write operations
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      return next();
    }

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to invalidate cache after successful write
    res.json = async function (data) {
      // Only invalidate on successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          // Invalidate specific patterns
          for (const pattern of patterns) {
            await cacheService.delPattern(pattern);
          }

          // Also invalidate common cache keys based on route
          const route = req.route?.path || req.path;
          if (route) {
            // Invalidate related caches
            const basePattern = route.split('/').filter(Boolean)[0];
            if (basePattern) {
              await cacheService.delPattern(`cache:*${basePattern}*`);
            }
          }
        } catch (error) {
          console.error('Cache invalidation error:', error);
        }
      }

      // Call original json method
      return originalJson(data);
    };

    next();
  };
};

/**
 * Manual cache helper functions
 */
export const cacheHelpers = {
  /**
   * Cache a function result
   * @param {string} key - Cache key
   * @param {Function} fn - Function to execute and cache
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<any>} - Cached or fresh result
   */
  async cacheFunction(key, fn, ttl = 300) {
    const cached = await cacheService.get(key);
    if (cached !== null) {
      return cached;
    }

    const result = await fn();
    await cacheService.set(key, result, ttl);
    return result;
  },

  /**
   * Invalidate cache by key
   * @param {string} key - Cache key
   */
  async invalidate(key) {
    await cacheService.del(key);
  },

  /**
   * Invalidate cache by pattern
   * @param {string} pattern - Pattern to match
   */
  async invalidatePattern(pattern) {
    await cacheService.delPattern(pattern);
  }
};






