const mongoose = require('mongoose');
const SystemConfig = require('../models/SystemConfig');
const WebsiteMembershipApplication = require('../models/WebsiteMembershipApplication');
const googleSheetsService = require('../utils/googleSheetsService');

async function testGoogleSheetsApproval() {
  try {
    console.log('🔍 Google Sheets onaylama testi başlatılıyor...');
    
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/meumt_development';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB bağlantısı kuruldu');

    const systemConfig = await SystemConfig.findOne();
    if (!systemConfig) {
      console.log('❌ SystemConfig bulunamadı');
      return;
    }

    console.log('📋 SystemConfig durumu:');
    console.log('- Google Sheets isEnabled:', systemConfig.googleSheets?.isEnabled);
    console.log('- Google Sheets isActive:', systemConfig.googleSheets?.isActive);
    console.log('- Spreadsheet URL:', systemConfig.googleSheets?.spreadsheetUrl);
    console.log('- Credentials var mı:', !!systemConfig.googleSheets?.credentials?.data);

    if (!systemConfig.googleSheets?.isEnabled) {
      console.log('⚠️ Google Sheets devre dışı, etkinleştiriliyor...');
      systemConfig.googleSheets.isEnabled = true;
      systemConfig.googleSheets.isActive = true;
      await systemConfig.save();
      console.log('✅ Google Sheets etkinleştirildi');
    }

    console.log('🔑 Google Sheets servisini başlatıyor...');
    
    try {
      if (systemConfig.googleSheets.credentials && systemConfig.googleSheets.credentials.data) {
        console.log('🔑 SystemConfig credentials kullanılıyor...');
        await googleSheetsService.initialize(systemConfig.googleSheets.credentials);
      } else {
        console.log('🔑 Varsayılan credentials kullanılıyor...');
        await googleSheetsService.initialize();
      }
      
      const healthCheck = await googleSheetsService.healthCheck();
      console.log('🏥 Health check sonucu:', healthCheck);
      
    } catch (error) {
      console.error('❌ Google Sheets bağlantı hatası:', error.message);
    }

    console.log('📝 Test başvurusu oluşturuluyor...');
    const testApplication = new WebsiteMembershipApplication({
      firstName: 'Test',
      lastName: 'Kullanıcı',
      email: 'test@example.com',
      password: 'test123',
      tcKimlikNo: '12345678901',
      studentNumber: '12345678',
      phone: '05321234567',
      department: 'Bilgisayar Mühendisliği'
    });

    await testApplication.save();
    console.log('✅ Test başvurusu oluşturuldu:', testApplication._id);

    console.log('🎯 Test onaylama işlemi başlatılıyor...');
    
    try {
      const spreadsheetUrl = systemConfig.googleSheets.spreadsheetUrl || systemConfig.googleSheets.url;
      
      const memberData = [
        testApplication.fullName,
        testApplication.tcKimlikNo,
        testApplication.studentNumber,
        testApplication.phone,
        testApplication.department,
        'IBAN', // ödeme alanı
        new Date().toLocaleDateString('tr-TR')
      ];

      console.log('📊 Google Sheets\'e eklenecek veri:', {
        name: testApplication.fullName,
        tc: testApplication.tcKimlikNo,
        studentNo: testApplication.studentNumber,
        phone: testApplication.phone,
        department: testApplication.department,
        date: new Date().toLocaleDateString('tr-TR')
      });

      const sheetsResult = await googleSheetsService.appendRow(spreadsheetUrl, memberData);
      
      if (sheetsResult.success) {
        console.log('🎉 Google Sheets\'e başarıyla eklendi:', sheetsResult.updatedRange);
        
        await testApplication.approve('Test onayı - Google Sheets\'e eklendi', null);
        console.log('✅ Başvuru onaylandı');
        
      } else {
        console.error('❌ Google Sheets\'e ekleme başarısız:', sheetsResult.message);
      }

    } catch (error) {
      console.error('❌ Onaylama testi hatası:', error);
    }

    await WebsiteMembershipApplication.findByIdAndDelete(testApplication._id);
    console.log('🧹 Test başvurusu silindi');

    console.log('✅ Test tamamlandı');

  } catch (error) {
    console.error('❌ Test hatası:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB bağlantısı kapatıldı');
  }
}

if (require.main === module) {
  testGoogleSheetsApproval();
}

module.exports = testGoogleSheetsApproval; 