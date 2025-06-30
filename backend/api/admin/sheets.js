const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const adminMiddleware = require('../../middleware/admin');
const SystemConfig = require('../../models/SystemConfig');
const membershipValidationService = require('../../services/membershipValidationService');
const googleSheetsService = require('../../utils/googleSheetsService');
const googleSheetsConfig = require('../../config/googleSheetsConfig');
const logger = require('../../utils/logger');
const sheetsManager = require('../../services/googleSheetsManager');

router.post('/setup', protect, adminMiddleware, async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'Google Sheets URL gereklidir'
      });
    }

    const urlPattern = /^https:\/\/docs\.google\.com\/spreadsheets\/d\/[a-zA-Z0-9-_]+/;
    if (!urlPattern.test(url)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz Google Sheets URL formatı'
      });
    }

    await googleSheetsService.initialize();

    const testResult = await googleSheetsService.readSheet(url, 'A1:Z1');
    if (!testResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Google Sheets bağlantı testi başarısız: ' + testResult.message
      });
    }

    let systemConfig = await SystemConfig.findOne();
    if (!systemConfig) {
      systemConfig = new SystemConfig();
    }

    systemConfig.googleSheets = {
      url,
      isActive: true,
      autoSync: true,
      lastSync: new Date()
    };

    await systemConfig.save();

    return res.status(200).json({
      success: true,
      message: 'Google Sheets yapılandırması başarıyla kaydedildi',
      data: systemConfig.googleSheets
    });
  } catch (error) {
    logger.error('Google Sheets yapılandırma hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Google Sheets yapılandırması sırasında bir hata oluştu: ' + error.message
    });
  }
});

router.post('/sync', protect, adminMiddleware, async (req, res) => {
  try {
    const config = await SystemConfig.findOne();
    if (!config || !config.googleSheets || !config.googleSheets.url) {
      return res.status(400).json({
        success: false,
        message: 'Google Sheets yapılandırması bulunamadı. Önce yapılandırma yapın.'
      });
    }

    await googleSheetsService.initialize();
    
    console.log('🔄 Google Sheets senkronizasyonu başlatılıyor...');
    
    const result = await googleSheetsService.readSheet(config.googleSheets.url, 'A:Z');
    
    if (result.success) {
      const memberCount = result.data ? result.data.length - 1 : 0; // -1 for header row
      
      config.googleSheets.lastSync = new Date();
      await config.save();
      
      res.status(200).json({
        success: true,
        message: 'Google Sheets senkronizasyonu başarılı!',
        data: {
          totalMembers: memberCount,
          syncTime: config.googleSheets.lastSync,
          url: config.googleSheets.url
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Google Sheets senkronizasyonu başarısız!',
        error: result.message
      });
    }
  } catch (error) {
    logger.error('Sync error:', error);
    res.status(500).json({
      success: false,
      message: 'Senkronizasyon sırasında hata oluştu: ' + error.message
    });
  }
});

router.put('/config', protect, adminMiddleware, async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'Google Sheets URL alanı gereklidir'
      });
    }

    const urlPattern = /^https:\/\/docs\.google\.com\/spreadsheets\/d\/[a-zA-Z0-9-_]+/;
    if (!urlPattern.test(url)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz Google Sheets URL formatı'
      });
    }

    await googleSheetsService.initialize();

    const testResult = await googleSheetsService.readSheet(url, 'A1:Z1');
    if (!testResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Google Sheets bağlantı testi başarısız: ' + testResult.message
      });
    }

    let config = await SystemConfig.findOne();
    if (!config) {
      config = new SystemConfig();
    }

    config.googleSheets = {
      url,
      isActive: true,
      autoSync: true,
      lastSync: new Date()
    };

    await config.save();

    res.status(200).json({
      success: true,
      message: 'Google Sheets yapılandırması başarıyla güncellendi ve test edildi',
      data: {
        config: config.googleSheets,
        testResult: { success: true, message: 'Bağlantı başarılı' }
      }
    });
  } catch (error) {
    logger.error('Google Sheets yapılandırma güncelleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Google Sheets yapılandırması güncellenemedi: ' + error.message
    });
  }
});

router.post('/test-connection', protect, adminMiddleware, async (req, res) => {
  try {
    const config = await SystemConfig.findOne();
    if (!config || !config.googleSheets || !config.googleSheets.url) {
      return res.status(400).json({
        success: false,
        message: 'Google Sheets yapılandırması bulunamadı. Önce yapılandırma yapın.'
      });
    }

    await googleSheetsService.initialize();
    
    console.log('🔍 Google Sheets bağlantısı test ediliyor...');
    
    const testResult = await googleSheetsService.readSheet(config.googleSheets.url, 'A1:Z100');
    
    if (testResult.success) {
      const memberCount = testResult.data ? testResult.data.length - 1 : 0; // -1 for header row
      
      res.status(200).json({
        success: true,
        message: 'Google Sheets bağlantısı başarılı!',
        data: {
          totalMembers: memberCount,
          syncTime: new Date().toISOString(),
          url: config.googleSheets.url
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Google Sheets bağlantısı başarısız!',
        error: testResult.message
      });
    }
  } catch (error) {
    console.error('Test connection error:', error);
    res.status(500).json({
      success: false,
      message: 'Bağlantı testi sırasında hata oluştu: ' + error.message
    });
  }
});

router.get('/status', protect, adminMiddleware, async (req, res) => {
  try {
    const systemConfig = await SystemConfig.findOne({ type: 'google_sheets' });
    
    const isConfigured = !!(
      systemConfig && 
      systemConfig.googleSheets && 
      systemConfig.googleSheets.isActive && 
      (systemConfig.googleSheets.url || systemConfig.googleSheets.spreadsheetUrl)
    );

    res.status(200).json({
      success: true,
      isConfigured,
      data: isConfigured ? {
        lastSync: systemConfig.googleSheets.lastSync,
        autoSync: systemConfig.googleSheets.autoSync,
        syncInterval: systemConfig.googleSheets.syncInterval
      } : null
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      success: false,
      message: 'Durum kontrolü sırasında hata oluştu',
      error: error.message
    });
  }
});

router.get('/test', protect, adminMiddleware, async (req, res) => {
  try {
    const initResult = await googleSheetsService.initialize();
    if (!initResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Google Sheets API başlatılamadı',
        error: initResult.message,
        instructions: initResult.instructions || []
      });
    }

    const readResult = await googleSheetsService.readSheet();
    if (!readResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Google Sheets okunamadı',
        error: readResult.error
      });
    }

    const parseResult = googleSheetsService.parseMemberData(readResult.data);
    
    res.status(200).json({
      success: true,
      message: 'Google Sheets başarıyla test edildi',
      data: {
        sheetsUrl: googleSheetsService.getDefaultSheetsUrl(),
        totalRows: readResult.data.length,
        headers: readResult.data.length > 0 ? readResult.data[0] : [],
        sampleData: readResult.data.slice(0, 3), // İlk 3 satır
        validation: {
          parseResult: parseResult.success,
          validMembers: parseResult.success ? parseResult.validMembers : 0,
          errorCount: parseResult.success ? parseResult.errorCount : 0,
          errors: parseResult.success ? parseResult.errors.slice(0, 5) : [] // İlk 5 hata
        }
      }
    });
  } catch (error) {
    console.error('Google Sheets test error:', error);
    res.status(500).json({
      success: false,
      message: 'Google Sheets test başarısız',
      error: error.message
    });
  }
});

router.post('/sync', async (req, res) => {
  try {
    const { range = 'A:Z' } = req.body;

    const importResult = await googleSheetsService.importFromSheet(null, null, range);
    
    if (!importResult.success) {
      return res.status(400).json({
        success: false,
        message: importResult.message,
        error: importResult.error
      });
    }

    res.status(200).json({
      success: true,
      message: 'Google Sheets senkronizasyonu tamamlandı',
      data: {
        stats: importResult.stats,
        details: importResult.details
      }
    });
  } catch (error) {
    console.error('Google Sheets sync error:', error);
    res.status(500).json({
      success: false,
      message: 'Senkronizasyon başarısız',
      error: error.message
    });
  }
});

router.post('/add-member', protect, adminMiddleware, async (req, res) => {
  try {
    const { fullName, tcKimlikNo, studentNumber, phoneNumber, department, paymentMethod } = req.body;

    if (!fullName || !tcKimlikNo || !studentNumber) {
      return res.status(400).json({
        success: false,
        message: 'İsim/Soyisim, TC Kimlik No ve Öğrenci Numarası gereklidir'
      });
    }

    const config = await SystemConfig.findOne();
    if (!config || !config.googleSheets || !config.googleSheets.url) {
      return res.status(400).json({
        success: false,
        message: 'Google Sheets yapılandırması bulunamadı. Önce yapılandırma yapın.'
      });
    }

    await googleSheetsService.initialize();

    const memberData = {
      fullName,
      tcKimlikNo,
      studentNumber,
      phoneNumber: phoneNumber || '',
      department: department || '',
      paymentMethod: paymentMethod || 'Nakit'
    };

    const result = await googleSheetsService.addMemberToSheet(config.googleSheets.url, memberData);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Üye başarıyla Google Sheets\'e eklendi',
        data: memberData
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Üye eklenirken hata oluştu: ' + result.message
      });
    }
  } catch (error) {
    logger.error('Manuel üye ekleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Üye ekleme işlemi sırasında hata oluştu: ' + error.message
    });
  }
});

router.post('/validate-member', protect, adminMiddleware, async (req, res) => {
  try {
    const { tcKimlikNo, studentNumber } = req.body;

    if (!tcKimlikNo && !studentNumber) {
      return res.status(400).json({
        success: false,
        message: 'TC Kimlik No veya Öğrenci Numarası gereklidir'
      });
    }

    const config = await SystemConfig.findOne();
    if (!config || !config.googleSheets || !config.googleSheets.url) {
      return res.status(400).json({
        success: false,
        message: 'Google Sheets yapılandırması bulunamadı. Önce yapılandırma yapın.'
      });
    }

    await googleSheetsService.initialize();

    const result = await googleSheetsService.validateMember(config.googleSheets.url, tcKimlikNo, studentNumber);

    res.status(200).json(result);
  } catch (error) {
    logger.error('Üye doğrulama hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Üye doğrulama işlemi sırasında hata oluştu: ' + error.message
    });
  }
});

router.get('/search', protect, adminMiddleware, async (req, res) => {
  try {
    const { tc, studentNumber } = req.query;

    if (!tc && !studentNumber) {
      return res.status(400).json({
        success: false,
        message: 'TC Kimlik No veya Öğrenci Numarası gerekli'
      });
    }

    const searchResult = await googleSheetsService.findMemberInSheet(null, tc, studentNumber);
    
    res.status(200).json({
      success: true,
      message: searchResult.message,
      data: {
        found: searchResult.found,
        member: searchResult.member || null
      }
    });
  } catch (error) {
    console.error('Google Sheets search error:', error);
    res.status(500).json({
      success: false,
      message: 'Arama başarısız',
      error: error.message
    });
  }
});

router.get('/test-connection', async (req, res) => {
  try {
    console.log('🔍 Google Sheets bağlantısı test ediliyor...');
    
    const initResult = await googleSheetsService.initialize();
    if (!initResult.success) {
      console.error('❌ Google Sheets API başlatma başarısız:', initResult.message);
      return res.status(400).json({
        success: false,
        message: 'Google Sheets API başlatılamadı',
        error: initResult.message,
        details: initResult.details || 'Detay yok'
      });
    }

    console.log('✅ Google Sheets API başlatıldı');

    const sheetsUrl = process.env.GOOGLE_SHEETS_URL;
    console.log('📊 Test edilen URL:', sheetsUrl);
    
    const readResult = await googleSheetsService.readSheet(sheetsUrl, 'A1:Z10');
    if (!readResult.success) {
      console.error('❌ Google Sheets okuma başarısız:', readResult.error);
      return res.status(400).json({
        success: false,
        message: 'Google Sheets okunamadı',
        error: readResult.error,
        sheetsUrl: sheetsUrl
      });
    }

    console.log('✅ Google Sheets başarıyla okundu:', readResult.data.length, 'satır');

    console.log('🔄 Veri parse testi yapılıyor...');
    const parseResult = googleSheetsService.parseMemberData(readResult.data);
    console.log('📊 Parse sonucu:', parseResult.success ? 'BAŞARILI' : 'BAŞARISIZ');
    if (parseResult.success) {
      console.log('✅ Parse edildi:', parseResult.validMembers, 'geçerli üye,', parseResult.errorCount, 'hata');
    } else {
      console.log('❌ Parse hatası:', parseResult.message);
    }

    res.status(200).json({
      success: true,
      message: 'Google Sheets bağlantısı başarılı',
      data: {
        sheetsUrl: sheetsUrl,
        totalRows: readResult.data.length,
        headers: readResult.data.length > 0 ? readResult.data[0] : [],
        sampleData: readResult.data.slice(0, 3),
        parseTest: {
          success: parseResult.success,
          message: parseResult.message || 'Parse testi tamamlandı',
          validMembers: parseResult.validMembers || 0,
          errorCount: parseResult.errorCount || 0,
          errors: parseResult.errors?.slice(0, 3) || [],
          availableHeaders: parseResult.availableHeaders || []
        },
        connectionTest: 'PASSED',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Google Sheets bağlantı testi başarısız:', error);
    res.status(500).json({
      success: false,
      message: 'Google Sheets bağlantı testi başarısız',
      error: error.message,
      stack: error.stack
    });
  }
});

router.get('/public-status', async (req, res) => {
  try {
    const status = googleSheetsConfig.getStatus();
    const instructions = googleSheetsConfig.getSetupInstructions();
    
    const publicStatus = {
      configured: status.configured,
      credentialType: status.credentialType,
      sheetsUrl: !!status.sheetsUrl,
      isValid: status.validation.isValid,
      hasReadAccess: status.validation.hasReadAccess,
      hasWriteAccess: status.validation.hasWriteAccess,
      issues: status.validation.issues,
      setupRequired: !status.configured
    };
    
    res.status(200).json({
      success: true,
      message: 'Google Sheets konfigürasyon durumu (public)',
      data: {
        status: publicStatus,
        setupInstructions: instructions
      }
    });
  } catch (error) {
    console.error('Google Sheets public status error:', error);
    res.status(500).json({
      success: false,
      message: 'Konfigürasyon durumu kontrol edilemedi',
      error: error.message
    });
  }
});

router.get('/config', protect, adminMiddleware, async (req, res) => {
  try {
    const config = await SystemConfig.findOne();
    console.log('🔍 Retrieved config:', config);
    console.log('🔍 Google Sheets config:', config?.googleSheets);
    
    if (!config || !config.googleSheets) {
      return res.status(200).json({
        success: true,
        configured: false,
        message: 'Google Sheets yapılandırması bulunamadı'
      });
    }

    const sheetsConfig = config.googleSheets;
    const isConfigured = !!(sheetsConfig.url || sheetsConfig.spreadsheetId);

    console.log('📊 Sheets config:', sheetsConfig);
    console.log('✅ Is configured:', isConfigured);

    res.json({
      success: true,
      configured: isConfigured,
      sheetsUrl: sheetsConfig.url || null,
      data: isConfigured ? {
        url: sheetsConfig.url,
        spreadsheetId: sheetsConfig.spreadsheetId,
        isActive: sheetsConfig.isActive,
        autoSync: sheetsConfig.autoSync,
        lastSync: sheetsConfig.lastSync
      } : null
    });
  } catch (error) {
    console.error('❌ Google Sheets config error:', error);
    logger.error('Google Sheets config error:', error);
    res.status(500).json({
      success: false,
      configured: false,
      message: 'Google Sheets yapılandırması kontrol edilemedi',
      error: error.message
    });
  }
});

router.delete('/config', async (req, res) => {
  try {
    await SystemConfig.findOneAndDelete({ type: 'google_sheets' });

    res.json({
      success: true,
      message: 'Google Sheets konfigürasyonu başarıyla kaldırıldı'
    });

  } catch (error) {
    console.error('Config delete error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Konfigürasyon kaldırılırken hata oluştu' 
    });
  }
});

router.get('/debug-test', protect, adminMiddleware, async (req, res) => {
  try {
    console.log('🔍 Google Sheets debug test başlatılıyor...');
    
    const initResult = await googleSheetsService.initialize();
    
    if (!initResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Google Sheets service başlatılamadı',
        error: initResult.message
      });
    }

    const testUrl = 'https://docs.google.com/spreadsheets/d/195xqak9XApyCVAxEQ7ik777oL_nIKEeiiZtsqasRXY8/edit?usp=sharing';
    
    const readResult = await googleSheetsService.readSheet(testUrl, 'A1:Z10');
    
    res.status(200).json({
      success: readResult.success,
      message: readResult.success ? 'Google Sheets test başarılı' : 'Google Sheets test başarısız',
      data: readResult.success ? {
        rowCount: readResult.data ? readResult.data.length : 0,
        sampleData: readResult.data ? readResult.data.slice(0, 3) : []
      } : null,
      error: readResult.success ? null : readResult.message
    });
  } catch (error) {
    console.error('Debug test error:', error);
    res.status(500).json({
      success: false,
      message: 'Debug test başarısız',
      error: error.message
    });
  }
});

router.get('/config-status', protect, adminMiddleware, async (req, res) => {
  try {
    const config = await SystemConfig.findOne();
    if (config && config.googleSheets && config.googleSheets.url) {
      res.status(200).json({
        success: true,
        isConfigured: true,
        spreadsheetUrl: config.googleSheets.url,
      });
    } else {
      res.status(200).json({
        success: true,
        isConfigured: false,
        spreadsheetUrl: '',
      });
    }
  } catch (error) {
    logger.error('Error fetching Google Sheets config status:', error);
    res.status(500).json({
      success: false,
      message: 'Google E-Tablolar yapılandırma durumu alınamadı.',
    });
  }
});

module.exports = router; 