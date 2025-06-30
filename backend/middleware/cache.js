const NodeCache = require('node-cache');
const logger = require('../utils/logger');

const cache = new NodeCache({
  stdTTL: 300,
  checkperiod: 120,
  useClones: false
});

const parseTime = (timeStr) => {
  const units = {
    second: 1,
    seconds: 1,
    minute: 60,
    minutes: 60,
    hour: 3600,
    hours: 3600,
    day: 86400,
    days: 86400
  };

  const [amount, unit] = timeStr.split(' ');
  return parseInt(amount) * (units[unit] || 0);
};

const cacheMiddleware = (duration = 300) => {
  return (req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }

    const key = req.originalUrl;
    const cachedResponse = cache.get(key);

    if (cachedResponse) {
      logger.debug(`Cache hit for ${key}`);
      return res.json(cachedResponse);
    }

    const originalJson = res.json;

    res.json = function(body) {
      res.json = originalJson;

      cache.set(key, body, duration);
      logger.debug(`Cache set for ${key} with TTL ${duration}s`);

      return originalJson.call(this, body);
    };

    next();
  };
};

const invalidateCache = (key) => {
  if (key) {
    cache.del(key);
    logger.debug(`Cache invalidated for ${key}`);
  } else {
    cache.flushAll();
    logger.debug('All cache invalidated');
  }
};

module.exports = {
  cacheMiddleware,
  invalidateCache
}; 