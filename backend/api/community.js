const express = require('express');
const router = express.Router();
const SystemConfig = require('../models/SystemConfig');
const { protect, admin } = require('../middleware/auth');
const googleSheetsManager = require('../services/googleSheetsManager');
const CommunityMember = require('../models/CommunityMember');
const logger = require('../utils/logger');
const upload = require('../middleware/upload');

router.post('/apply', upload.single('paymentReceipt'), async (req, res) => {
  try {
    const { 
      firstName, 
      lastName, 
      fullName, 
      tcKimlikNo,
      studentNumber, 
      phone, 
      department,
      reason 
    } = req.body;

    const paymentReceiptPath = req.file ? req.file.path : null;

    let fName = firstName;
    let lName = lastName;
    
    if (!fName && !lName && fullName) {
      const nameParts = fullName.trim().split(' ');
      fName = nameParts[0];
      lName = nameParts.slice(1).join(' ') || nameParts[0];
    }

    const tcNumber = tcKimlikNo;

    if (!fName || !lName || !tcNumber || !studentNumber || !department) {
      return res.status(400).json({
        success: false,
        message: 'Tüm gerekli alanlar doldurulmalıdır'
      });
    }

    if (tcNumber && (tcNumber.length !== 11 || !/^\d{11}$/.test(tcNumber))) {
      return res.status(400).json({
        success: false,
        message: 'TC Kimlik numarası 11 haneli olmalıdır'
      });
    }

    const existingApplication = await CommunityMember.findOne({
      $or: [
        { tcKimlikNo: tcNumber },
        { studentNumber }
      ]
    });

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: 'Bu bilgilerle daha önce başvuru yapılmış'
      });
    }

    const config = await SystemConfig.findOne();
    if (config && config.googleSheets) {
      try {
        const validationResult = await googleSheetsManager.validateMember(tcNumber, studentNumber);
        
        if (!validationResult.success || !validationResult.isValid) {
          return res.status(403).json({
            success: false,
            message: 'Topluluk üyesi olarak bulunamadınız. Lütfen önce topluluğa üye olun.'
          });
        }
      } catch (error) {
        logger.warn('Google Sheets validation failed, proceeding without validation:', error);
      }
    }

    const application = await CommunityMember.create({
      firstName: fName,
      lastName: lName,
      tcno: tcNumber,
      studentNumber,
      phone,
      department,
      paymentReceipt: paymentReceiptPath,
      status: 'PENDING'
    });

    res.status(201).json({
      success: true,
      message: 'Başvurunuz başarıyla alındı. En kısa sürede değerlendirilecektir.',
      data: {
        id: application._id,
        status: application.status
      }
    });

  } catch (error) {
    logger.error('Community application error:', error);
    res.status(500).json({
      success: false,
      message: 'Başvuru işlemi sırasında bir hata oluştu',
      error: error.message
    });
  }
});

router.get('/admin/stats', protect, admin, async (req, res) => {
  try {
    const totalApplications = await CommunityMember.countDocuments();
    const pendingApplications = await CommunityMember.countDocuments({ status: 'pending' });
    const approvedMembers = await CommunityMember.countDocuments({ status: 'approved' });
    const rejectedApplications = await CommunityMember.countDocuments({ status: 'rejected' });
    
    const recentApplications = await CommunityMember.find()
      .sort({ applicationDate: -1 })
      .limit(10)
      .populate('approvedBy rejectedBy', 'fullName email');

    res.status(200).json({
      success: true,
      data: {
        stats: {
          total: totalApplications,
          pending: pendingApplications,
          approved: approvedMembers,
          rejected: rejectedApplications
        },
        recentApplications
      }
    });
  } catch (error) {
    logger.error('Community stats error:', error);
    res.status(500).json({
      success: false,
      message: 'İstatistikler alınamadı',
      error: error.message
    });
  }
});

module.exports = router; 