const mongoose = require('mongoose');
const SystemConfig = require('../models/SystemConfig');
const googleSheetsService = require('../utils/googleSheetsService');

async function testGoogleSheets() {
  try {
    await mongoose.connect('mongodb://localhost:27017/meumt-web', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ MongoDB bağlantısı kuruldu');
    
    const config = await SystemConfig.findOne();
    if (!config) {
      console.error('❌ SystemConfig bulunamadı');
      return;
    }
    
    console.log('📊 Google Sheets Config:');
    console.log('- isEnabled:', config.googleSheets.isEnabled);
    console.log('- spreadsheetUrl:', config.googleSheets.spreadsheetUrl);
    
    if (!config.googleSheets.isEnabled) {
      console.error('❌ Google Sheets entegrasyonu aktif değil');
      return;
    }
    
    console.log('\n🔄 Google Sheets API başlatılıyor...');
    const initResult = await googleSheetsService.initialize();
    
    if (!initResult.success) {
      console.error('❌ Google Sheets API başlatılamadı:', initResult.message);
      console.error('📋 Instructions:', initResult.instructions);
      return;
    }
    
    console.log('✅ Google Sheets API başlatıldı');
    
    console.log('\n📖 Google Sheets verisi okunuyor...');
    const readResult = await googleSheetsService.readSheet(config.googleSheets.spreadsheetUrl);
    
    if (!readResult.success) {
      console.error('❌ Google Sheets verisi okunamadı:', readResult.message);
      return;
    }
    
    console.log('✅ Google Sheets verisi okundu');
    console.log('📊 Toplam satır sayısı:', readResult.data.length);
    
    if (readResult.data.length > 0) {
      console.log('📋 İlk satır (başlıklar):', readResult.data[0]);
      if (readResult.data.length > 1) {
        console.log('📋 İkinci satır (örnek veri):', readResult.data[1]);
      }
    }
    
    console.log('\n🔍 Test kullanıcısı aranıyor...');
    const searchResult = await googleSheetsService.findMemberInSheet(
      config.googleSheets.spreadsheetUrl,
      null, // TC Kimlik No
      '24220030087' // Test öğrenci numarası
    );
    
    console.log('🔍 Arama sonucu:', searchResult);
    
    console.log('\n✅ Website membership validation test...');
    const validationResult = await googleSheetsService.validateWebsiteMembershipApplication(
      config.googleSheets.spreadsheetUrl,
      null,
      '24220030087'
    );
    
    console.log('✅ Validation sonucu:', validationResult);
    
  } catch (error) {
    console.error('❌ Test hatası:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB bağlantısı kapatıldı');
  }
}

if (require.main === module) {
  testGoogleSheets();
}

module.exports = testGoogleSheets; 