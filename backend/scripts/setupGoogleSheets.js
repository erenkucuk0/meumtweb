const mongoose = require('mongoose');
const SystemConfig = require('../models/SystemConfig');

async function setupGoogleSheets() {
  try {
    await mongoose.connect('mongodb://localhost:27017/meumt-web', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ MongoDB bağlantısı kuruldu');
    
    let config = await SystemConfig.findOne();
    
    if (!config) {
      console.log('📝 SystemConfig bulunamadı, yeni oluşturuluyor...');
      config = await SystemConfig.getCurrentConfig();
    }
    
    const sheetUrl = 'https://docs.google.com/spreadsheets/d/195xqak9XApyCVAxEQ7ik777oL_nIKEeiiZtsqasRXY8/edit';
    const spreadsheetId = '195xqak9XApyCVAxEQ7ik777oL_nIKEeiiZtsqasRXY8';

    config.googleSheets.url = sheetUrl;
    config.googleSheets.spreadsheetId = spreadsheetId;
    config.googleSheets.isActive = true;
    config.googleSheets.isConfigured = true;
    config.googleSheets.autoSync = true;
    config.googleSheets.lastSync = null;
    config.googleSheets.syncInterval = 30;
    
    await config.save();
    
    console.log('✅ Google Sheets konfigürasyonu aktif edildi');
    console.log('📊 Spreadsheet URL:', config.googleSheets.url);
    console.log('🔄 Auto Sync:', config.googleSheets.autoSync);
    console.log('⏰ Sync Interval:', config.googleSheets.syncInterval, 'dakika');
    
  } catch (error) {
    console.error('❌ Setup hatası:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB bağlantısı kapatıldı');
  }
}

if (require.main === module) {
  setupGoogleSheets();
}

module.exports = setupGoogleSheets; 