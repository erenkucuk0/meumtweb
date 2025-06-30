const rateLimit = require('express-rate-limit');

const csrfProtection = (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  if (req.headers.authorization) {
    return next();
  }

  const csrfToken = req.headers['x-csrf-token'] || req.body._token;
  const csrfCookie = req.cookies['csrf-token'];

  if (!csrfToken || !csrfCookie || csrfToken !== csrfCookie) {
    return res.status(403).json({
      success: false,
      error: 'CSRF token mismatch'
    });
  }

  next();
};

const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: message
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

const rateLimiters = {
  auth: createRateLimit(
    15 * 60 * 1000, // 15 minutes
    10, // 10 attempts (normal production value)
    'Çok fazla giriş denemesi. 15 dakika sonra tekrar deneyin.'
  ),
  
  api: createRateLimit(
    15 * 60 * 1000, // 15 minutes
    100, // 100 requests
    'API rate limit aşıldı. Lütfen daha sonra tekrar deneyin.'
  ),
  
  upload: createRateLimit(
    60 * 60 * 1000, // 1 hour
    20, // 20 uploads
    'Dosya yükleme limiti aşıldı. 1 saat sonra tekrar deneyin.'
  )
};

const enhancedSanitization = (req, res, next) => {
  const sanitizeObject = (obj) => {
    for (let key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (typeof obj[key] === 'string') {
          obj[key] = obj[key]
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '');
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObject(obj[key]);
        }
      }
    }
  };

  if (req.body) sanitizeObject(req.body);
  if (req.query) sanitizeObject(req.query);
  if (req.params) sanitizeObject(req.params);

  next();
};

module.exports = {
  csrfProtection,
  rateLimiters,
  enhancedSanitization
}; 