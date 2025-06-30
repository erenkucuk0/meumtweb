const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const logger = require('../utils/logger');
const User = require('../models/User');

let UserModel = null;
let modelLoadAttempted = false;
let modelLoadError = null;
let lastConnectionCheck = 0;
const CONNECTION_CHECK_INTERVAL = 30000; // 30 seconds
const TOKEN_REFRESH_THRESHOLD = 24 * 60 * 60 * 1000; // 24 hours

const refreshToken = (oldToken) => {
  try {
    const jwtSecret = process.env.JWT_SECRET || 'meumt-secret-key-2024';
    const decoded = jwt.verify(oldToken, jwtSecret);
    const tokenAge = Date.now() - (decoded.iat * 1000);
    
    if (tokenAge > TOKEN_REFRESH_THRESHOLD) {
      return jwt.sign({ id: decoded.id }, jwtSecret, {
        expiresIn: process.env.JWT_EXPIRE || '30d'
      });
    }
    return oldToken;
  } catch (error) {
    return null;
  }
};

const isConnectionHealthy = async (retryCount = 0) => {
  const maxRetries = 3;
  const now = Date.now();
  
  try {
    if (now - lastConnectionCheck < CONNECTION_CHECK_INTERVAL) {
      return mongoose.connection.readyState === 1;
    }
    
    lastConnectionCheck = now;
    
    if (mongoose.connection.readyState !== 1) {
      if (retryCount < maxRetries) {
        console.log(`🔄 MongoDB bağlantısı yeniden deneniyor (${retryCount + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return isConnectionHealthy(retryCount + 1);
      }
      return false;
    }
    
    await mongoose.connection.db.admin().ping();
    return true;
  } catch (error) {
    console.error('MongoDB bağlantı kontrolü hatası:', error.message);
    if (retryCount < maxRetries) {
      return isConnectionHealthy(retryCount + 1);
    }
    return false;
  }
};

const getUser = async () => {
  if (UserModel) {
    return UserModel;
  }
  
  if (modelLoadAttempted && modelLoadError) {
    throw modelLoadError;
  }
  
  try {
    if (!(await isConnectionHealthy())) {
      throw new Error('MongoDB bağlantısı sağlıklı değil');
    }
    
    UserModel = require('../models/User');
    modelLoadAttempted = true;
    
    if (!UserModel || typeof UserModel.findById !== 'function') {
      throw new Error('Geçersiz User model yapısı');
    }
    
    return UserModel;
  } catch (error) {
    modelLoadAttempted = true;
    modelLoadError = error;
    throw error;
  }
};

const userCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const findUserById = async (id, options = {}) => {
  const { bypassCache = false, select = '-password' } = options;
  
  try {
    if (!bypassCache) {
      const cached = userCache.get(id);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.user;
      }
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    
    const User = await getUser();
    const user = await User.findById(id).select(select);
    
    if (user) {
      userCache.set(id, {
        user,
        timestamp: Date.now()
      });
    }
    
    return user;
  } catch (error) {
    console.error('User lookup error:', error.message);
    return null;
  }
};

const validateToken = async (token) => {
  try {
    const jwtSecret = process.env.JWT_SECRET || 'meumt-secret-key-2024';
    const decoded = jwt.verify(token, jwtSecret);
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token süresi dolmuş');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Geçersiz token');
    }
    throw error;
  }
};

const validateUser = async (userId) => {
  const User = await getUser();
  const user = await User.findById(userId).select('+password');
  
  if (!user) {
    throw new Error('Kullanıcı bulunamadı');
  }
  
  if (!user.isActive) {
    throw new Error('Hesap deaktif edilmiş');
  }
  
  return user;
};

const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    else if (req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Bu işlem için yetkiniz yok'
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'meumt-secret-key-2024');

      const User = require('../models/User');
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Kullanıcı bulunamadı'
        });
      }

      if (!req.user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Hesap deaktif edilmiş'
        });
      }

      next();
    } catch (error) {
      logger.error('Token doğrulama hatası:', error);
      return res.status(401).json({
        success: false,
        message: 'Geçersiz token'
      });
    }
  } catch (error) {
    logger.error('Auth middleware hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için yetkiniz yok'
      });
    }

    next();
  };
};

const admin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için admin yetkisi gerekli'
      });
    }

    next();
  } catch (error) {
    logger.error('Admin middleware hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    else if (req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'meumt-secret-key-2024');

      const User = require('../models/User');
      req.user = await User.findById(decoded.id).select('-password');
      
      next();
    } catch (error) {
      next();
    }
  } catch (error) {
    logger.error('Optional auth middleware hatası:', error);
    next();
  }
};

module.exports = {
  protect,
  authorize,
  admin,
  optionalAuth
}; 