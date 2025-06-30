const crypto = require('crypto');
const User = require('../../models/User');
const logger = require('../../utils/logger');
const sendEmail = require('../../utils/sendEmail');
const bcrypt = require('bcryptjs');

const registerUser = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, studentNumber, department, phone } = req.body;

    if (studentNumber) {
      try {
        const SystemConfig = require('../../models/SystemConfig');
        const systemConfig = await SystemConfig.findOne();
        
        if (systemConfig && systemConfig.googleSheets && systemConfig.googleSheets.isEnabled) {
          const googleSheetsService = require('../../utils/googleSheetsService');
          
          const credentials = {
            type: 'service_account',
            data: {
              type: 'service_account',
              project_id: systemConfig.googleSheets.projectId,
              private_key: systemConfig.googleSheets.privateKey,
              client_email: systemConfig.googleSheets.serviceAccountEmail
            }
          };

          const initResult = await googleSheetsService.initialize(credentials);
          if (initResult.success) {
            const checkResult = await googleSheetsService.checkStudentExists(
              systemConfig.googleSheets.spreadsheetUrl,
              studentNumber
            );

            if (!checkResult.exists) {
              return res.status(403).json({
                success: false,
                error: 'Kayıt yetkiniz bulunmamaktadır. Lütfen önce topluluk üyeliğinizi tamamlayın.'
              });
            }
          }
        }
      } catch (sheetsError) {
        console.error('Google Sheets check error:', sheetsError);
      }
    }

    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      studentNumber,
      department,
      phone
    });

    const verificationToken = user.getEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    const verificationUrl = `${req.protocol}://${req.get('host')}/api/users/verify-email/${verificationToken}`;

    const message = `
      Merhaba ${user.firstName},
      
      MEÜMT platformuna hoş geldiniz! E-posta adresinizi doğrulamak için aşağıdaki linke tıklayın:
      
      ${verificationUrl}
      
      Bu link 24 saat geçerlidir.
      
      MEÜMT Ekibi
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: 'MEÜMT - E-posta Doğrulama',
        message
      });

      res.status(201).json({
        success: true,
        message: 'Kullanıcı oluşturuldu. E-posta doğrulama linki gönderildi.',
        data: {
          user: {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role
          }
        }
      });
    } catch (error) {
      logger.error('Email send error:', error);
      user.emailVerificationToken = undefined;
      user.emailVerificationExpire = undefined;
      await user.save({ validateBeforeSave: false });

      return res.status(500).json({
        success: false,
        error: 'E-posta gönderilemedi'
      });
    }
  } catch (error) {
    logger.error('Register error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

const login = async (req, res, next) => {
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
        error: 'E-posta ve şifre alanları zorunludur. Lütfen her iki alanı da doldurun.',
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
        error: 'Geçerli bir e-posta adresi giriniz. E-posta formatı: ornek@domain.com',
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
        error: 'Bu e-posta adresi ile kayıtlı bir hesap bulunamadı. Lütfen e-posta adresinizi kontrol edin veya kayıt olmayı deneyin.',
        errorCode: 'USER_NOT_FOUND',
        suggestion: 'E-posta adresinizi kontrol edin veya yeni hesap oluşturun'
      });
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      logger.warn('Login attempt with wrong password', { 
        userId: user._id,
        email: email.substring(0, 3) + '***',
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      return res.status(401).json({
        success: false,
        error: 'Girdiğiniz şifre yanlış. Lütfen şifrenizi kontrol edin ve tekrar deneyin.',
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
      return res.status(401).json({
        success: false,
        error: 'Hesabınız şu anda askıya alınmış durumda. Bu durumla ilgili yardım almak için sistem yöneticisi ile iletişime geçin.',
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
        error: 'Veritabanı bağlantı sorunu yaşanıyor. Lütfen birkaç dakika sonra tekrar deneyin.',
        errorCode: 'DATABASE_ERROR',
        suggestion: 'Sorun devam ederse sistem yöneticisi ile iletişime geçin'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Giriş işlemi sırasında beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.',
      errorCode: 'INTERNAL_SERVER_ERROR',
      suggestion: 'Sorun devam ederse sistem yöneticisi ile iletişime geçin'
    });
  }
};

const logout = async (req, res, next) => {
  res.status(200).json({
    success: true,
    message: 'Başarıyla çıkış yapıldı'
  });
};

const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      data: { user }
    });
  } catch (error) {
    logger.error('Get me error:', error);
    res.status(500).json({
      success: false,
      error: 'Sunucu hatası'
    });
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const fieldsToUpdate = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      phone: req.body.phone,
      department: req.body.department,
      bio: req.body.bio,
      instruments: req.body.instruments,
      musicalExperience: req.body.musicalExperience,
      socialMedia: req.body.socialMedia
    };

    Object.keys(fieldsToUpdate).forEach(key => 
      fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
    );

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: { user }
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

const updatePassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('+password');

    if (!(await user.matchPassword(req.body.currentPassword))) {
      return res.status(401).json({
        success: false,
        error: 'Mevcut şifre yanlış'
      });
    }

    user.password = req.body.newPassword;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    logger.error('Update password error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Bu e-posta adresi ile kayıtlı kullanıcı bulunamadı'
      });
    }

    const resetToken = user.getResetPasswordToken();

    await user.save({ validateBeforeSave: false });

    const resetUrl = `${req.protocol}://${req.get('host')}/api/users/reset-password/${resetToken}`;

    const message = `
      Merhaba ${user.firstName},
      
      Şifre sıfırlama talebiniz alındı. Yeni şifre oluşturmak için aşağıdaki linke tıklayın:
      
      ${resetUrl}
      
      Bu link 10 dakika geçerlidir.
      
      MEÜMT Ekibi
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: 'MEÜMT - Şifre Sıfırlama',
        message
      });

      res.status(200).json({
        success: true,
        message: 'Şifre sıfırlama linki e-posta adresinize gönderildi'
      });
    } catch (error) {
      logger.error('Email send error:', error);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;

      await user.save({ validateBeforeSave: false });

      return res.status(500).json({
        success: false,
        error: 'E-posta gönderilemedi'
      });
    }
  } catch (error) {
    logger.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: 'Sunucu hatası'
    });
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resettoken)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Geçersiz veya süresi dolmuş token'
      });
    }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    logger.error('Reset password error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

const verifyEmail = async (req, res, next) => {
  try {
    const emailVerificationToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      emailVerificationToken,
      emailVerificationExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Geçersiz veya süresi dolmuş doğrulama token\'ı'
      });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: 'E-posta başarıyla doğrulandı'
    });
  } catch (error) {
    logger.error('Verify email error:', error);
    res.status(500).json({
      success: false,
      error: 'Sunucu hatası'
    });
  }
};

const resendVerification = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Kullanıcı bulunamadı'
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        error: 'E-posta zaten doğrulanmış'
      });
    }

    const verificationToken = user.getEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    const verificationUrl = `${req.protocol}://${req.get('host')}/api/users/verify-email/${verificationToken}`;

    const message = `
      Merhaba ${user.firstName},
      
      E-posta adresinizi doğrulamak için aşağıdaki linke tıklayın:
      
      ${verificationUrl}
      
      Bu link 24 saat geçerlidir.
      
      MEÜMT Ekibi
    `;

    await sendEmail({
      email: user.email,
      subject: 'MEÜMT - E-posta Doğrulama',
      message
    });

    res.status(200).json({
      success: true,
      message: 'Doğrulama e-postası yeniden gönderildi'
    });
  } catch (error) {
    logger.error('Resend verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Sunucu hatası'
    });
  }
};

const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Lütfen bir dosya seçin'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { avatar: req.file.filename },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: { user }
    });
  } catch (error) {
    logger.error('Upload avatar error:', error);
    res.status(500).json({
      success: false,
      error: 'Sunucu hatası'
    });
  }
};

const getUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const startIndex = (page - 1) * limit;

    let query = {};
    
    if (req.query.search) {
      query.$text = { $search: req.query.search };
    }
    
    if (req.query.role) {
      query.role = req.query.role;
    }
    
    if (req.query.isActive !== undefined) {
      query.isActive = req.query.isActive === 'true';
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(startIndex);

    const pagination = {};

    if (startIndex + limit < total) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      pagination,
      data: { users }
    });
  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: 'Sunucu hatası'
    });
  }
};

const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Kullanıcı bulunamadı'
      });
    }

    res.status(200).json({
      success: true,
      data: { user }
    });
  } catch (error) {
    logger.error('Get user by id error:', error);
    res.status(500).json({
      success: false,
      error: 'Sunucu hatası'
    });
  }
};

const updateUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Kullanıcı bulunamadı'
      });
    }

    res.status(200).json({
      success: true,
      data: { user }
    });
  } catch (error) {
    logger.error('Update user error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Kullanıcı bulunamadı'
      });
    }

    await user.remove();

    res.status(200).json({
      success: true,
      message: 'Kullanıcı silindi'
    });
  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      error: 'Sunucu hatası'
    });
  }
};

const sendTokenResponse = (user, statusCode, res) => {
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true
  };

  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  res.status(statusCode).json({
    success: true,
    token,
    data: {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isEmailVerified: user.isEmailVerified
      }
    }
  });
};

module.exports = {
  registerUser,
  login,
  logout,
  getMe,
  updateProfile,
  updatePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  uploadAvatar,
  getUsers,
  getUserById,
  updateUser,
  deleteUser
}; 