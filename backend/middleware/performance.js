const compression = require('compression');
const logger = require('../utils/logger');

const optimizeMongoose = (mongoose) => {
  mongoose.set('maxPoolSize', 10); // Maximum number of connections
  mongoose.set('serverSelectionTimeoutMS', 5000); // Timeout for server selection
  mongoose.set('socketTimeoutMS', 45000); // Socket timeout
  mongoose.set('family', 4); // Use IPv4, skip trying IPv6
  mongoose.set('bufferMaxEntries', 0); // Disable mongoose buffering
  mongoose.set('bufferCommands', false); // Disable mongoose buffering
};

const responseTime = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
    
    if (duration > 1000) {
      logger.warn(`Slow request detected: ${req.method} ${req.originalUrl} took ${duration}ms`);
    }
  });
  
  next();
};

const memoryMonitor = (req, res, next) => {
  const memUsage = process.memoryUsage();
  
  if (Math.random() < 0.01) {
    logger.info('Memory Usage:', {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)} MB`
    });
  }
  
  if (memUsage.heapUsed > 500 * 1024 * 1024) { // 500MB
    logger.warn(`High memory usage: ${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`);
  }
  
  next();
};

const requestSizeLimit = (maxSize = '10mb') => {
  return (req, res, next) => {
    const contentLength = parseInt(req.get('Content-Length'));
    
    if (contentLength && contentLength > parseFloat(maxSize) * 1024 * 1024) {
      return res.status(413).json({
        success: false,
        error: 'Request entity too large'
      });
    }
    
    next();
  };
};

const optimizeResponse = (req, res, next) => {
  res.setHeader('X-Response-Time', Date.now());
  
  if (req.httpVersionMajor >= 2) {
    res.setHeader('Link', '</api/events>; rel=prefetch');
  }
  
  if (req.method === 'GET') {
    if (req.url.includes('/api/events') || req.url.includes('/api/gallery')) {
      res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes
    } else if (req.url.includes('/api/users/me')) {
      res.setHeader('Cache-Control', 'private, max-age=60'); // 1 minute
    }
  }
  
  next();
};

const queryOptimization = {
  paginateQuery: (query, page = 1, limit = 10) => {
    const skip = (page - 1) * limit;
    limit = Math.min(limit, 100); // Max 100 items per page
    
    return query.skip(skip).limit(limit);
  },
  
  selectFields: (query, fields) => {
    if (fields && Array.isArray(fields)) {
      return query.select(fields.join(' '));
    }
    return query;
  },
  
  optimizePopulate: (query, populateFields) => {
    if (populateFields && Array.isArray(populateFields)) {
      populateFields.forEach(field => {
        if (typeof field === 'string') {
          query.populate(field);
        } else if (field.path) {
          query.populate(field.path, field.select);
        }
      });
    }
    return query;
  }
};

const gracefulShutdown = (server) => {
  const shutdown = (signal) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);
    
    server.close((err) => {
      if (err) {
        logger.error('Error during server close:', err);
        process.exit(1);
      }
      
      logger.info('Server closed successfully');
      process.exit(0);
    });
    
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 30000);
  };
  
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

module.exports = {
  optimizeMongoose,
  responseTime,
  memoryMonitor,
  requestSizeLimit,
  optimizeResponse,
  queryOptimization,
  gracefulShutdown
}; 