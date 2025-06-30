const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  logger.error('ERROR STACK: ', err.stack);
  logger.error('FULL ERROR OBJECT: ', err);

  logger.error('Error details:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
    params: req.params,
    user: req.user ? req.user.id : null,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  if (err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT') {
    const message = 'Sunucu bağlantısı kurulamıyor. Lütfen internet bağlantınızı kontrol edin ve tekrar deneyin.';
    error = { 
      message, 
      statusCode: 503, 
      retryAfter: 5,
      errorCode: 'NETWORK_ERROR',
      suggestion: 'İnternet bağlantınızı kontrol edin, birkaç saniye bekleyip tekrar deneyin'
    };
    res.set('Retry-After', '5');
  }

  if (err.code === 401 && err.message.includes('Google')) {
    const message = 'Google servisleri ile bağlantı sorunu yaşanıyor. Sistem yöneticisi ile iletişime geçin.';
    error = { 
      message, 
      statusCode: 503,
      errorCode: 'GOOGLE_API_ERROR',
      suggestion: 'Bu sorun sistem yöneticisi tarafından çözülmelidir'
    };
  }

  if (err.name === 'CastError') {
    const message = `Geçersiz ID formatı: ${err.value}. Lütfen doğru bir ID kullanın.`;
    error = { 
      statusCode: 404, 
      message,
      errorCode: 'INVALID_ID_FORMAT',
      suggestion: 'Geçerli bir ID formatı kullanın'
    };
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    const message = `Bu ${field === 'email' ? 'e-posta adresi' : field} zaten kullanımda: ${value}`;
    error = { 
      statusCode: 400, 
      message,
      errorCode: 'DUPLICATE_FIELD',
      field: field,
      suggestion: field === 'email' ? 'Farklı bir e-posta adresi deneyin veya giriş yapmayı deneyin' : 'Farklı bir değer deneyin'
    };
  }

  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(val => ({
      field: val.path,
      message: val.message,
      value: val.value
    }));
    const message = 'Form doğrulama hatası. Lütfen tüm alanları doğru şekilde doldurun.';
    error = { 
      statusCode: 400, 
      message,
      errorCode: 'VALIDATION_ERROR',
      details: errors,
      suggestion: 'Form alanlarını kontrol edin ve gerekli düzeltmeleri yapın'
    };
  }

  if (err.name === 'JsonWebTokenError') {
    const message = 'Oturum bilgileriniz geçersiz. Güvenliğiniz için lütfen tekrar giriş yapın.';
    error = { 
      message, 
      statusCode: 401,
      errorCode: 'INVALID_TOKEN',
      suggestion: 'Tekrar giriş yapın'
    };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Oturum süreniz dolmuş. Güvenliğiniz için lütfen tekrar giriş yapın.';
    error = { 
      message, 
      statusCode: 401,
      errorCode: 'TOKEN_EXPIRED',
      suggestion: 'Oturumunuzun süresi doldu, yeniden giriş yapın'
    };
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    const message = 'Yüklemeye çalıştığınız dosya çok büyük. Lütfen daha küçük bir dosya seçin.';
    error = { 
      message, 
      statusCode: 400,
      errorCode: 'FILE_TOO_LARGE',
      suggestion: 'Dosya boyutunu küçültün veya farklı bir dosya seçin'
    };
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    const message = 'Desteklenmeyen dosya türü. Lütfen geçerli bir dosya formatı seçin.';
    error = { 
      message, 
      statusCode: 400,
      errorCode: 'INVALID_FILE_TYPE',
      suggestion: 'Sadece desteklenen dosya formatlarını (JPG, PNG, PDF vb.) kullanın'
    };
  }

  if (err.name === 'MongoNetworkError' || err.name === 'MongoTimeoutError') {
    const message = 'Veritabanı bağlantı sorunu yaşanıyor. Lütfen birkaç dakika sonra tekrar deneyin.';
    error = {
      message,
      statusCode: 503,
      errorCode: 'DATABASE_CONNECTION_ERROR',
      suggestion: 'Birkaç dakika bekleyip tekrar deneyin'
    };
  }

  if (err.code === 'ENOTFOUND' || err.code === 'EAI_AGAIN') {
    const message = 'DNS çözümleme hatası. İnternet bağlantınızı kontrol edin.';
    error = {
      message,
      statusCode: 503,
      errorCode: 'DNS_ERROR',
      suggestion: 'İnternet bağlantınızı ve DNS ayarlarınızı kontrol edin'
    };
  }

  const response = {
    success: false,
    error: error.message || 'Beklenmeyen bir sunucu hatası oluştu. Lütfen tekrar deneyin.',
    errorCode: error.errorCode || 'UNKNOWN_ERROR',
    ...(error.suggestion && { suggestion: error.suggestion }),
    ...(error.details && { details: error.details }),
    ...(error.field && { field: error.field }),
    ...(error.retryAfter && { retryAfter: error.retryAfter }),
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      debugInfo: err.details || err
    })
  };

  res.status(error.statusCode || 500).json(response);
};

module.exports = errorHandler;