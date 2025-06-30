const { body, query, param, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation hatası',
      errors: errors.array()
    });
  }
  next();
};

const userValidation = {
  register: [
    body('fullName').trim().notEmpty().withMessage('Ad soyad gereklidir'),
    body('email').isEmail().withMessage('Geçerli bir email adresi giriniz'),
    body('password').isLength({ min: 6 }).withMessage('Şifre en az 6 karakter olmalıdır'),
    body('username').trim().notEmpty().withMessage('Kullanıcı adı gereklidir'),
    body('studentNumber').trim().notEmpty().withMessage('Öğrenci numarası gereklidir'),
    handleValidationErrors
  ],
  login: [
    body('email').isEmail().withMessage('Geçerli bir email adresi giriniz'),
    body('password').notEmpty().withMessage('Şifre gereklidir'),
    handleValidationErrors
  ]
};

const eventValidation = {
  create: [
    body('title').trim().notEmpty().withMessage('Etkinlik başlığı gereklidir'),
    body('description').trim().notEmpty().withMessage('Açıklama gereklidir'),
    body('date').isISO8601().withMessage('Geçerli bir tarih giriniz'),
    body('type').isIn(['conference', 'workshop', 'seminar', 'meeting']).withMessage('Geçerli etkinlik tipi seçiniz'),
    handleValidationErrors
  ]
};

const contactValidation = {
  create: [
    body('name').trim().notEmpty().withMessage('İsim gereklidir'),
    body('email').isEmail().withMessage('Geçerli bir email adresi giriniz'),
    body('message').trim().notEmpty().withMessage('Mesaj gereklidir'),
    handleValidationErrors
  ]
};

const paginationValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Sayfa numarası pozitif bir sayı olmalıdır'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit 1-100 arasında olmalıdır'),
  query('sort').optional().isIn(['asc', 'desc']).withMessage('Sıralama asc veya desc olmalıdır'),
  handleValidationErrors
];

const idValidation = [
  param('id').isMongoId().withMessage('Geçerli bir ID giriniz'),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  userValidation,
  eventValidation,
  contactValidation,
  paginationValidation,
  idValidation
}; 