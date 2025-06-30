const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const membershipValidationService = require('../services/membershipValidationService');
const MembershipApplication = require('../models/MembershipApplication');
const User = require('../models/User');
const SystemConfig = require('../models/SystemConfig');
const { protect, authorize } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/payment-receipts');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'payment-receipt-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Sadece JPG, PNG veya PDF dosyaları kabul edilir.'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

const checkEligibility = async (req, res) => {
  try {
    const { studentNumber, fullName } = req.body;

    if (!studentNumber || !fullName) {
      return res.status(400).json({
        success: false,
        message: 'Öğrenci numarası ve ad soyad gereklidir'
      });
    }

    const validation = await membershipValidationService.validateMembershipEligibility(
      studentNumber,
      fullName
    );

    res.status(200).json({
      success: true,
      data: validation
    });

  } catch (error) {
    console.error('Eligibility check error:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

const submitApplication = async (req, res) => {
  try {
    const { tcNumber, fullName, department, studentNumber, phoneNumber, paymentAmount } = req.body;
    const paymentReceiptFile = req.file;

    if (!tcNumber || !fullName || !department || !studentNumber || !paymentAmount) {
      return res.status(400).json({
        success: false,
        message: 'TC Kimlik No, Ad Soyad, Bölüm, Öğrenci Numarası ve Ödeme Miktarı zorunludur'
      });
    }

    if (!paymentReceiptFile) {
      return res.status(400).json({
        success: false,
        message: 'Ödeme dekontu yüklenmesi zorunludur'
      });
    }

    const existingApplication = await MembershipApplication.findOne({
      studentNumber: studentNumber
    });

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: 'Bu öğrenci numarası ile daha önce başvuru yapılmış'
      });
    }

    const applicationData = {
      fullName,
      department,
      studentNumber,
      phoneNumber,
      paymentAmount: parseFloat(paymentAmount),
      paymentReceipt: {
        filename: paymentReceiptFile.filename,
        originalName: paymentReceiptFile.originalname,
        mimetype: paymentReceiptFile.mimetype,
        size: paymentReceiptFile.size,
        path: paymentReceiptFile.path
      }
    };

    const result = await membershipValidationService.processMembershipApplication(applicationData);

    if (!result.success) {
      if (fs.existsSync(paymentReceiptFile.path)) {
        fs.unlinkSync(paymentReceiptFile.path);
      }
      return res.status(400).json(result);
    }

    res.status(201).json({
      success: true,
      message: result.message,
      data: {
        applicationId: result.application._id,
        status: result.application.status,
        isEligible: result.validation ? result.validation.isEligible : false
      }
    });

  } catch (error) {
    console.error('Application submission error:', error);
    
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

const getPendingApplications = async (req, res) => {
  try {
    const { status = 'PENDING', page = 1, limit = 10 } = req.query;

    const applications = await MembershipApplication.find({ status })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('reviewedBy', 'username fullName', null, { 
        strictPopulate: false,
        retainNullValues: true // Context7 pattern: Keep null values for missing refs
      })
      .populate('createdUser', 'username fullName', null, { 
        strictPopulate: false,
        retainNullValues: true
      })
      .setOptions({ 
        strictQuery: false, // Context7 pattern: Allow flexible queries
        strictPopulate: false // Context7 pattern: Prevent populate errors
      });

    const total = await MembershipApplication.countDocuments({ status });

    res.status(200).json({
      success: true,
      data: applications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get applications error:', error);
    
    const errorResponse = {
      success: false,
      message: 'Sunucu hatası'
    };
    
    if (process.env.NODE_ENV === 'development') {
      errorResponse.debug = {
        error: error.message,
        stack: error.stack?.split('\n').slice(0, 3)
      };
    }
    
    res.status(500).json(errorResponse);
  }
};

const reviewApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes, assignPermissions = [] } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz durum. APPROVED veya REJECTED olmalıdır'
      });
    }

    const application = await MembershipApplication.findById(id);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Başvuru bulunamadı'
      });
    }

    if (application.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'Bu başvuru zaten işlenmiş'
      });
    }

    application.status = status;
    application.adminNotes = adminNotes || '';
    application.reviewedBy = req.user.id;
    application.reviewedAt = new Date();

    if (status === 'APPROVED') {
      try {
        const userData = {
          username: application.studentNumber, // Use student number as username
          email: `${application.studentNumber}@student.meumt.edu.tr`, // Generate email
          password: 'temp123456', // Temporary password, user should change
          fullName: application.fullName,
          firstName: application.fullName.split(' ')[0],
          lastName: application.fullName.split(' ').slice(1).join(' '),
          studentNumber: application.studentNumber,
          department: application.department,
          phone: application.phoneNumber,
          role: 'user',
          isActive: true,
          isEmailVerified: false // User should verify email
        };

        if (application.additionalInfo) {
          userData.instruments = application.additionalInfo.instruments || [];
          userData.musicalExperience = application.additionalInfo.musicalExperience || 'beginner';
          userData.bio = application.additionalInfo.motivation || '';
        }

        const newUser = await User.create(userData);

        application.createdUser = newUser._id;

        await application.save();

        if (application.paymentReceipt) {
          const fs = require('fs');
          const path = require('path');
          
          try {
            const filePath = path.join(__dirname, '..', application.paymentReceipt);
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
              console.log(`✅ Onaylanan başvuru dosyası silindi: ${application.paymentReceipt}`);
            }
          } catch (fileError) {
            console.error('❌ Dosya silme hatası:', fileError);
          }
        }

        res.status(200).json({
          success: true,
          message: `Başvuru ${status === 'APPROVED' ? 'onaylandı' : 'reddedildi'}. Kullanıcı hesabı oluşturuldu.`,
          data: {
            application,
            user: {
              id: newUser._id,
              username: newUser.username,
              email: newUser.email
            }
          }
        });

      } catch (userCreationError) {
        console.error('User creation error:', userCreationError);
        
        await application.save();
        
        res.status(200).json({
          success: true,
          message: `Başvuru onaylandı ancak kullanıcı hesabı oluşturulurken hata oluştu: ${userCreationError.message}`,
          data: application
        });
      }
    } else {
      await application.save();
      
      res.status(200).json({
        success: true,
        message: 'Başvuru reddedildi',
        data: application
      });
    }

  } catch (error) {
    console.error('Review application error:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

router.post('/check-eligibility', checkEligibility);

const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'Dosya boyutu çok büyük. Maksimum 5MB olmalıdır.'
      });
    }
    return res.status(400).json({
      success: false,
      message: `Dosya yükleme hatası: ${error.message}`
    });
  }
  
  if (error.message && error.message.includes('Sadece JPG, PNG veya PDF')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  next(error);
};

router.post('/apply', upload.single('paymentReceipt'), handleMulterError, submitApplication);
router.get('/admin/applications', protect, authorize('admin'), getPendingApplications);
router.put('/admin/applications/:id', protect, authorize('admin'), reviewApplication);

module.exports = router; 