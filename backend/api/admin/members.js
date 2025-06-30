const express = require('express');
const router = express.Router();
const { protect, admin } = require('../../middleware/auth');
const SystemConfig = require('../../models/SystemConfig');
const CommunityMember = require('../../models/CommunityMember');
const googleSheetsManager = require('../../services/googleSheetsManager');
const logger = require('../../utils/logger');

router.get('/applications', protect, admin, async (req, res) => {
  try {
    const { status = 'PENDING', page = 1, limit = 10 } = req.query;

    const queryStatus = status.toUpperCase();

    const applications = await CommunityMember.find({ status: queryStatus })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await CommunityMember.countDocuments({ status: queryStatus });

    res.json({
      success: true,
      data: applications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Applications fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Başvurular alınamadı',
      error: error.message
    });
  }
});

router.get('/', protect, admin, async (req, res) => {
  try {
    const config = await SystemConfig.findOne();
    if (!config || !config.googleSheets) {
      return res.status(404).json({
        success: false,
        message: 'Google Sheets yapılandırması bulunamadı'
      });
    }

    const result = await googleSheetsManager.sheetsService.readSheet(
      config.googleSheets.spreadsheetId
    );

    if (!result.success) {
      throw new Error(result.message || 'Üye listesi alınamadı');
    }

    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    logger.error('Üye listesi alma hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Üye listesi alınamadı',
      error: error.message
    });
  }
});

router.post('/manual-add', protect, admin, async (req, res) => {
  try {
    const config = await SystemConfig.findOne();
    if (!config || !config.googleSheets) {
      return res.status(404).json({
        success: false,
        message: 'Google Sheets yapılandırması bulunamadı'
      });
    }

    const spreadsheetId = config.googleSheets.spreadsheetId;
    if (!spreadsheetId) {
      return res.status(404).json({
        success: false,
        message: 'Google Sheets ID bulunamadı'
      });
    }

    logger.info('Manuel üye ekleme isteği:', req.body);

    const memberData = {
      fullName: req.body.fullName,
      studentNumber: req.body.studentNumber,
      tcKimlikNo: req.body.tcKimlikNo,
      phone: req.body.phone || req.body.phoneNumber,
      department: req.body.department,
      paymentMethod: 'IBAN',
      date: new Date().toISOString().split('T')[0]
    };

    const sheetValues = [
      memberData.fullName,
      memberData.tcKimlikNo,
      memberData.studentNumber,
      memberData.phone,
      memberData.department,
      memberData.paymentMethod,
      memberData.date
    ];

    const result = await googleSheetsManager.appendToSheet(spreadsheetId, 'Sheet1!A:G', sheetValues);

    if (!result) {
      throw new Error('Üye eklenemedi');
    }

    config.googleSheets.lastSync = new Date();
    await config.save();

    res.status(200).json({
      success: true,
      message: 'Üye başarıyla eklendi',
      data: memberData
    });
  } catch (error) {
    logger.error('Manuel üye ekleme hatası:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Üye eklenirken bir hata oluştu'
    });
  }
});

router.get('/search', protect, admin, async (req, res) => {
  try {
    const { tcKimlikNo, studentNumber } = req.query;

    if (!tcKimlikNo && !studentNumber) {
      return res.status(400).json({
        success: false,
        message: 'TC Kimlik No veya Öğrenci Numarası gerekli'
      });
    }

    const config = await SystemConfig.findOne();
    if (!config || !config.googleSheets) {
      return res.status(404).json({
        success: false,
        message: 'Google Sheets yapılandırması bulunamadı'
      });
    }

    const result = await googleSheetsManager.sheetsService.searchMember(
      config.googleSheets.spreadsheetId,
      tcKimlikNo,
      studentNumber
    );

    if (!result.success) {
      throw new Error(result.message || 'Üye araması başarısız');
    }

    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    logger.error('Üye arama hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Üye araması başarısız',
      error: error.message
    });
  }
});

router.post('/applications/:id/approve', protect, admin, async (req, res) => {
  try {
    const application = await CommunityMember.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ success: false, message: 'Başvuru bulunamadı' });
    }

    application.status = 'APPROVED';
    application.approvedBy = req.user.id;
    await application.save();

    const config = await SystemConfig.findOne();
    if (config && config.googleSheets?.spreadsheetId) {
      const tcField = application.tcno || application.tcKimlikNo;
      const sheetValues = [
        application.fullName,
        tcField,
        application.studentNumber,
        application.phone,
        application.department,
        'IBAN', // F column
        new Date().toISOString().split('T')[0] // G column
      ];
      await googleSheetsManager.appendToSheet(config.googleSheets.spreadsheetId, 'Sheet1!A:G', sheetValues);
    }

    res.json({ success: true, message: 'Başvuru onaylandı ve E-Tabloya eklendi' });
  } catch (error) {
    logger.error('Approve application error:', error);
    res.status(500).json({ success: false, message: 'Onaylama işlemi başarısız', error: error.message });
  }
});

router.post('/applications/:id/reject', protect, admin, async (req, res) => {
  try {
    const application = await CommunityMember.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ success: false, message: 'Başvuru bulunamadı' });
    }

    application.status = 'REJECTED';
    application.approvedBy = null; // Ensure approvedBy is cleared
    await application.save();

    res.json({ success: true, message: 'Başvuru reddedildi' });
  } catch (error) {
    logger.error('Reject application error:', error);
    res.status(500).json({ success: false, message: 'Reddetme işlemi başarısız', error: error.message });
  }
});

router.delete('/applications/:id', protect, admin, async (req, res) => {
  try {
    const application = await CommunityMember.findByIdAndDelete(req.params.id);
    if (!application) {
      return res.status(404).json({ success: false, message: 'Başvuru bulunamadı' });
    }
    res.json({ success: true, message: 'Başvuru silindi' });
  } catch (error) {
    logger.error('Delete application error:', error);
    res.status(500).json({ success: false, message: 'Silme işlemi başarısız', error: error.message });
  }
});

module.exports = router; 