const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

/**
 * @swagger
 * components:
 *   schemas:
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: Kullanıcı e-posta adresi
 *           example: "user@example.com"
 *         password:
 *           type: string
 *           minLength: 6
 *           description: Kullanıcı şifresi
 *           example: "password123"
 *     
 *     LoginResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         token:
 *           type: string
 *           description: JWT access token
 *         user:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             username:
 *               type: string
 *             fullName:
 *               type: string
 *             email:
 *               type: string
 *             role:
 *               type: string
 *               enum: [user, admin, moderator]
 *     
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           description: Hata mesajı
 *         errorCode:
 *           type: string
 *           description: Hata kodu
 *         suggestion:
 *           type: string
 *           description: Kullanıcı için öneri
 *         details:
 *           type: object
 *           description: Detaylı hata bilgileri
 */

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id);

  const options = {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

  res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      user: {
        _id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role
      }
    });
};

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Kullanıcı girişi
 *     description: E-posta ve şifre ile kullanıcı girişi yapar
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Başarılı giriş
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *               example: token=jwt_token; HttpOnly; Secure; SameSite=Strict
 *       400:
 *         description: Geçersiz istek - Eksik veya hatalı veriler
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               missing_credentials:
 *                 summary: Eksik kimlik bilgileri
 *                 value:
 *                   success: false
 *                   message: "E-posta ve şifre alanları zorunludur"
 *                   errorCode: "MISSING_CREDENTIALS"
 *               invalid_email:
 *                 summary: Geçersiz e-posta formatı
 *                 value:
 *                   success: false
 *                   message: "Geçerli bir e-posta adresi giriniz"
 *                   errorCode: "INVALID_EMAIL_FORMAT"
 *       401:
 *         description: Yetkisiz erişim - Hatalı kimlik bilgileri
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               user_not_found:
 *                 summary: Kullanıcı bulunamadı
 *                 value:
 *                   success: false
 *                   message: "Bu e-posta adresi ile kayıtlı bir hesap bulunamadı"
 *                   errorCode: "USER_NOT_FOUND"
 *               invalid_password:
 *                 summary: Yanlış şifre
 *                 value:
 *                   success: false
 *                   message: "Girdiğiniz şifre yanlış"
 *                   errorCode: "INVALID_PASSWORD"
 *       403:
 *         description: Hesap askıya alınmış
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Hesabınız şu anda askıya alınmış durumda"
 *               errorCode: "ACCOUNT_SUSPENDED"
 *       500:
 *         description: Sunucu hatası
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            logger.warn('Login attempt with missing credentials', { 
                ip: req.ip, 
                userAgent: req.get('User-Agent'),
                hasEmail: !!email,
                hasPassword: !!password 
            });
            return res.status(400).json({ 
                success: false, 
                message: 'E-posta ve şifre alanları zorunludur. Lütfen her iki alanı da doldurun.',
                errorCode: 'MISSING_CREDENTIALS',
                details: {
                    email: !email ? 'E-posta adresi gerekli' : null,
                    password: !password ? 'Şifre gerekli' : null
                }
            });
        }

        if (!email.includes('@')) {
            logger.warn('Login attempt with invalid email format', { 
                email: email.substring(0, 3) + '***',
                ip: req.ip 
            });
            return res.status(400).json({ 
                success: false, 
                message: 'Geçerli bir e-posta adresi giriniz. E-posta formatı: ornek@domain.com',
                errorCode: 'INVALID_EMAIL_FORMAT'
            });
        }

        const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

        if (!user) {
            logger.warn('Login attempt with non-existent email', { 
                email: email.substring(0, 3) + '***',
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });
            return res.status(401).json({ 
                success: false, 
                message: 'Bu e-posta adresi ile kayıtlı bir hesap bulunamadı. Lütfen e-posta adresinizi kontrol edin veya kayıt olmayı deneyin.',
                errorCode: 'USER_NOT_FOUND',
                suggestion: 'E-posta adresinizi kontrol edin veya yeni hesap oluşturun'
            });
        }

        const isPasswordMatch = await user.matchPassword(password);
        if (!isPasswordMatch) {
            logger.warn('Login attempt with wrong password', { 
                userId: user._id,
                email: email.substring(0, 3) + '***',
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });
            return res.status(401).json({ 
                success: false, 
                message: 'Girdiğiniz şifre yanlış. Lütfen şifrenizi kontrol edin ve tekrar deneyin.',
                errorCode: 'INVALID_PASSWORD',
                suggestion: 'Şifrenizi unuttuysanız şifre sıfırlama özelliğini kullanabilirsiniz'
            });
        }
        
        if (!user.isActive) {
            logger.warn('Login attempt with inactive account', { 
                userId: user._id,
                email: email.substring(0, 3) + '***',
                ip: req.ip 
            });
            return res.status(403).json({ 
                success: false, 
                message: 'Hesabınız şu anda askıya alınmış durumda. Bu durumla ilgili yardım almak için sistem yöneticisi ile iletişime geçin.',
                errorCode: 'ACCOUNT_SUSPENDED',
                suggestion: 'Hesap durumunuz hakkında bilgi almak için destek ekibi ile iletişime geçin'
            });
        }
        
        user.lastLogin = new Date();
        await user.save({ validateBeforeSave: false });

        logger.info('Successful login', { 
            userId: user._id,
            email: email.substring(0, 3) + '***',
            role: user.role 
        });

        sendTokenResponse(user, 200, res);

    } catch (error) {
        logger.error('Login system error:', {
            error: error.message,
            stack: error.stack,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });
        
        if (error.name === 'MongoError' || error.name === 'MongooseError') {
            return res.status(503).json({ 
                success: false, 
                message: 'Veritabanı bağlantı sorunu yaşanıyor. Lütfen birkaç dakika sonra tekrar deneyin.',
                errorCode: 'DATABASE_ERROR',
                suggestion: 'Sorun devam ederse sistem yöneticisi ile iletişime geçin'
            });
        }

        res.status(500).json({ 
            success: false, 
            message: 'Giriş işlemi sırasında beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.',
            errorCode: 'INTERNAL_SERVER_ERROR',
            suggestion: 'Sorun devam ederse sistem yöneticisi ile iletişime geçin'
        });
    }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Mevcut kullanıcı bilgilerini getir
 *     description: Oturum açmış kullanıcının profil bilgilerini döndürür
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Kullanıcı bilgileri başarıyla alındı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Yetkisiz erişim - Token geçersiz veya eksik
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Kullanıcı bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Sunucu hatası
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
        return res.status(404).json({ 
            success: false, 
            message: 'Kullanıcı profili bulunamadı. Oturumunuz geçersiz olabilir.',
            errorCode: 'USER_NOT_FOUND',
            suggestion: 'Lütfen tekrar giriş yapın'
        });
    }
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('Error fetching current user:', error);
    res.status(500).json({ 
        success: false, 
        message: 'Kullanıcı bilgileri alınırken hata oluştu.',
        errorCode: 'FETCH_USER_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     summary: Access token yenileme
 *     description: Refresh token kullanarak yeni access token alır
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Token başarıyla yenilendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 token:
 *                   type: string
 *                   description: Yeni JWT access token
 *       401:
 *         description: Yetkisiz erişim - Refresh token geçersiz veya eksik
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               missing_token:
 *                 summary: Refresh token eksik
 *                 value:
 *                   success: false
 *                   message: "Oturum yenileme token'i bulunamadı"
 *                   errorCode: "MISSING_REFRESH_TOKEN"
 *               expired_token:
 *                 summary: Token süresi dolmuş
 *                 value:
 *                   success: false
 *                   message: "Oturum süreniz dolmuş"
 *                   errorCode: "REFRESH_TOKEN_EXPIRED"
 */
router.post('/refresh-token', async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
        return res.status(401).json({ 
            success: false, 
            message: 'Oturum yenileme token\'i bulunamadı. Lütfen tekrar giriş yapın.',
            errorCode: 'MISSING_REFRESH_TOKEN',
            suggestion: 'Güvenliğiniz için tekrar giriş yapmanız gerekiyor'
        });
    }

    try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Token geçersiz veya kullanıcı bulunamadı. Lütfen tekrar giriş yapın.',
                errorCode: 'INVALID_REFRESH_TOKEN'
            });
        }
        
        const accessToken = generateToken(user._id);

        res.status(200).json({
            success: true,
            token: accessToken
        });

    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false, 
                message: 'Oturum süreniz dolmuş. Güvenliğiniz için lütfen tekrar giriş yapın.',
                errorCode: 'REFRESH_TOKEN_EXPIRED',
                suggestion: 'Oturumunuzun süresi doldu, yeniden giriş yapın'
            });
        }
        
        return res.status(401).json({ 
            success: false, 
            message: 'Oturum yenileme sırasında hata oluştu. Lütfen tekrar giriş yapın.',
            errorCode: 'REFRESH_TOKEN_ERROR'
        });
    }
});

module.exports = router; 