const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { protect } = require('../middleware/auth');
const admin = require('../middleware/admin');
const User = require('../models/User');
const WebsiteMembershipApplication = require('../models/WebsiteMembershipApplication');
const SystemConfig = require('../models/SystemConfig');
const googleSheetsService = require('../utils/googleSheetsService');
const mongoose = require('mongoose');
const googleSheetsManager = require('../services/googleSheetsManager');
const logger = require('../utils/logger');
const membershipValidationService = require('../services/membershipValidationService');

router.post('/apply', async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      studentNumber,
      password
    } = req.body;

    if (!firstName || !lastName || !email || !password || !studentNumber) {
      return res.status(400).json({
        success: false,
        message: 'Ad, soyad, e-posta, öğrenci numarası ve şifre alanları zorunludur'
      });
    }

    const existingUser = await User.findOne({
      $or: [
        { email: email },
        { studentNumber: studentNumber }
      ]
    });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Bu e-posta veya öğrenci numarası ile zaten kayıtlı bir kullanıcı mevcut'
      });
    }

    const systemConfig = await SystemConfig.findOne();
    if (!systemConfig || !systemConfig.googleSheets || !systemConfig.googleSheets.isActive || !(systemConfig.googleSheets.url || systemConfig.googleSheets.spreadsheetUrl)) {
      return res.status(500).json({
        success: false,
        message: 'Google Sheets entegrasyonu yapılandırılmamış.'
      });
    }
    const spreadsheetUrl = systemConfig.googleSheets.spreadsheetUrl || systemConfig.googleSheets.url;
    const sheetResult = await googleSheetsService.readSheet(spreadsheetUrl);
    if (!sheetResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Google Sheets okuma hatası: ' + (sheetResult.message || 'Bilinmeyen hata')
      });
    }
    const parsed = googleSheetsService.parseMemberData(sheetResult.data);
    const found = parsed.data.find(m => (m.studentNumber + '').trim() === (studentNumber + '').trim());
    if (!found) {
      return res.status(403).json({
        success: false,
        message: 'Topluluğa üye olmanız gerekmektedir. Lütfen önce topluluğa üye olun.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const sheetFullName = found.name || '';
    const nameParts = sheetFullName.trim().split(' ');
    const sheetFirstName = nameParts[0] || firstName;
    const sheetLastName = nameParts.slice(1).join(' ') || lastName;
    
    const userData = {
      firstName: sheetFirstName,
      lastName: sheetLastName,
      email,
      studentNumber,
      password: hashedPassword,
      role: 'user',
      isActive: true,
      isEmailVerified: true,
      membershipStatus: 'APPROVED',
      googleSheetsValidated: true,
      autoApproved: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      __v: 0
    };
    const userResult = await mongoose.connection.db.collection('users').insertOne(userData);
    const user = {
      _id: userResult.insertedId,
      ...userData
    };
    return res.status(201).json({
      success: true,
      message: 'Hesabınız başarıyla oluşturuldu! Artık giriş yapabilirsiniz.',
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      },
      autoApproved: true,
      googleSheetsVerified: true
    });
  } catch (error) {
    console.error('Website membership application error:', error);
    return res.status(500).json({
      success: false,
      message: 'Kayıt işlemi sırasında bir hata oluştu',
      error: error.message
    });
  }
});

router.get('/status/:id', async (req, res) => {
  try {
    const application = await WebsiteMembershipApplication.findById(req.params.id)
      .populate('user', 'email')
      .lean();

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Başvuru bulunamadı'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        ...application,
        user: application.user
      }
    });

  } catch (error) {
    console.error('Application status check error:', error);
    res.status(500).json({
      success: false,
      message: 'Başvuru durumu sorgulanırken bir hata oluştu',
      error: error.message
    });
  }
});

router.get('/admin/applications', protect, admin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      googleSheetsStatus,
      autoApproved
    } = req.query;

    const query = {};
    
    if (status) {
      query.applicationStatus = status;
    }
    
    if (googleSheetsStatus) {
      query.googleSheetsValidationStatus = googleSheetsStatus;
    }
    
    if (autoApproved !== undefined) {
      query.autoApproved = autoApproved === 'true';
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 },
      populate: [
        { path: 'user', select: 'email' }
      ]
    };

    const applications = await WebsiteMembershipApplication.paginate(query, options);

    res.json({
      success: true,
      applications: applications.docs,
      pagination: {
        total: applications.totalDocs,
        pages: applications.totalPages,
        page: applications.page,
        limit: applications.limit,
        hasNextPage: applications.hasNextPage,
        hasPrevPage: applications.hasPrevPage
      }
    });

  } catch (error) {
    console.error('Applications list error:', error);
    res.status(500).json({
      success: false,
      message: 'Başvurular listelenirken bir hata oluştu',
      error: error.message
    });
  }
});

router.put('/admin/applications/:id', protect, admin, async (req, res) => {
  try {
    const { status, reason } = req.body;
    
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz durum. APPROVED veya REJECTED olmalıdır'
      });
    }
    
    const application = await WebsiteMembershipApplication.findById(req.params.id);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Başvuru bulunamadı'
      });
    }

    if (application.applicationStatus !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'Bu başvuru zaten işlenmiş'
      });
    }

    if (status === 'APPROVED') {
      try {
        console.log(`🔥 ONAYLAMA BAŞLADI - Başvuru ID: ${req.params.id}, Admin: ${req.user?.email || req.user?.firstName}`);
        
        const systemConfig = await SystemConfig.findOne();
        
        if (!systemConfig || !systemConfig.googleSheets || !systemConfig.googleSheets.isActive || !(systemConfig.googleSheets.url || systemConfig.googleSheets.spreadsheetUrl)) {
          console.log('❌ Google Sheets konfigürasyonu bulunamadı veya devre dışı');
          return res.status(400).json({
            success: false,
            message: 'Google Sheets konfigürasyonu bulunamadı veya devre dışı'
          });
        }

        console.log('✅ Google Sheets konfigürasyonu aktif, işlem devam ediyor...');

        const spreadsheetUrl = systemConfig.googleSheets.spreadsheetUrl || systemConfig.googleSheets.url;
        
        if (systemConfig.googleSheets.credentials && systemConfig.googleSheets.credentials.data) {
          console.log('🔑 SystemConfig credentials kullanılıyor...');
          await googleSheetsService.initialize(systemConfig.googleSheets.credentials);
        } else {
          console.log('🔑 Varsayılan credentials kullanılıyor...');
          await googleSheetsService.initialize();
        }

        const memberData = [
          application.fullName,
          application.studentNumber,
          new Date().toLocaleDateString('tr-TR')
        ];

        console.log('📊 Google Sheets\'e eklenecek veri:', {
          name: application.fullName,
          studentNo: application.studentNumber,
          date: new Date().toLocaleDateString('tr-TR')
        });
        console.log('📋 Spreadsheet URL:', spreadsheetUrl);

        console.log('🚀 Google Sheets\'e ekleme işlemi başlatılıyor...');
        const sheetsResult = await googleSheetsService.appendRow(spreadsheetUrl, memberData);
        
        if (!sheetsResult.success) {
          throw new Error(sheetsResult.message || 'Google Sheets\'e ekleme başarısız');
        }
        
        console.log('🎉 Google Sheets\'e başarıyla eklendi:', sheetsResult.updatedRange);

        await application.approve(reason || 'Admin tarafından onaylandı ve Google Sheets\'e eklendi', req.user.id);

        console.log('✅ Başvuru veritabanında da onaylandı');

        res.json({
          success: true,
          message: 'Başvuru onaylandı ve Google Sheets\'e eklendi',
          application: {
            id: application._id,
            status: application.statusDisplay,
            googleSheetsRange: sheetsResult.updatedRange
          }
        });

      } catch (sheetsError) {
        console.error('❌ ONAYLAMA HATASI:', {
          error: sheetsError.message,
          stack: sheetsError.stack,
          applicationId: req.params.id,
          userId: req.user?.id
        });
        
        return res.status(500).json({
          success: false,
          message: `Google Sheets'e ekleme hatası: ${sheetsError.message}`
        });
      }
    } else {
      if (!reason) {
        return res.status(400).json({
          success: false,
          message: 'Red nedeni belirtilmelidir'
        });
      }

      await application.reject(reason, req.user.id);

      res.json({
        success: true,
        message: 'Başvuru reddedildi',
        application: {
          id: application._id,
          status: application.statusDisplay,
          rejectionReason: application.rejectionReason
        }
      });
    }

  } catch (error) {
    console.error('Application review error:', error);
    res.status(500).json({
      success: false,
      message: 'Başvuru işlenirken bir hata oluştu',
      error: error.message
    });
  }
});

router.get('/status', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    res.json({
      success: true,
      status: {
        email: user.email,
        studentNumber: user.studentNumber,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    logger.error('Üyelik durumu alma hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Üyelik durumu alınamadı',
      error: error.message
    });
  }
});

module.exports = router; 