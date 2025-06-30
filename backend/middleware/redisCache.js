const redis = require('redis');
const logger = require('../utils/logger');

const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true
});

redisClient.on('connect', () => {
  logger.info('Redis client connected');
});

redisClient.on('error', (err) => {
  logger.error('Redis client error:', err);
});

redisClient.on('ready', () => {
  logger.info('Redis client ready');
});

const connectRedis = async () => {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
  } catch (error) {
    logger.error('Redis connection failed:', error);
  }
};

const distributedCache = (duration = 300, keyGenerator = null) => {
  return async (req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }

    try {
      await connectRedis();

      const cacheKey = keyGenerator 
        ? keyGenerator(req) 
        : `cache:${req.originalUrl}:${JSON.stringify(req.query)}`;

      const cachedData = await redisClient.get(cacheKey);
      
      if (cachedData) {
        logger.info(`Cache hit for key: ${cacheKey}`);
        return res.json(JSON.parse(cachedData));
      }

      const originalJson = res.json;

      res.json = function(data) {
        if (res.statusCode === 200) {
          redisClient.setEx(cacheKey, duration, JSON.stringify(data))
            .then(() => {
              logger.info(`Data cached for key: ${cacheKey}`);
            })
            .catch(err => {
              logger.error('Cache set error:', err);
            });
        }
        
        originalJson.call(this, data);
      };

      next();
    } catch (error) {
      logger.error('Distributed cache error:', error);
      next(); // Continue without caching on error
    }
  };
};

const invalidatePattern = async (pattern) => {
  try {
    await connectRedis();
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
      logger.info(`Invalidated ${keys.length} cache keys matching pattern: ${pattern}`);
    }
  } catch (error) {
    logger.error('Cache invalidation error:', error);
  }
};

const invalidateKey = async (key) => {
  try {
    await connectRedis();
    await redisClient.del(key);
    logger.info(`Invalidated cache key: ${key}`);
  } catch (error) {
    logger.error('Cache key invalidation error:', error);
  }
};

const getCacheStats = async () => {
  try {
    await connectRedis();
    const info = await redisClient.info('memory');
    const keyCount = await redisClient.dbSize();
    
    return {
      connected: redisClient.isOpen,
      keyCount,
      memoryInfo: info
    };
  } catch (error) {
    logger.error('Cache stats error:', error);
    return { connected: false, error: error.message };
  }
};

const setSession = async (sessionId, data, expiry = 86400) => {
  try {
    await connectRedis();
    await redisClient.setEx(`session:${sessionId}`, expiry, JSON.stringify(data));
  } catch (error) {
    logger.error('Session set error:', error);
  }
};

const getSession = async (sessionId) => {
  try {
    await connectRedis();
    const data = await redisClient.get(`session:${sessionId}`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.error('Session get error:', error);
    return null;
  }
};

const deleteSession = async (sessionId) => {
  try {
    await connectRedis();
    await redisClient.del(`session:${sessionId}`);
  } catch (error) {
    logger.error('Session delete error:', error);
  }
};

const keyGenerators = {
  events: (req) => `events:${req.query.page || 1}:${req.query.limit || 10}:${req.query.type || 'all'}`,
  users: (req) => `users:${req.query.page || 1}:${req.query.limit || 10}`,
  gallery: (req) => `gallery:${req.query.category || 'all'}:${req.query.page || 1}`
};

module.exports = {
  redisClient,
  connectRedis,
  distributedCache,
  invalidatePattern,
  invalidateKey,
  getCacheStats,
  setSession,
  getSession,
  deleteSession,
  keyGenerators
}; 