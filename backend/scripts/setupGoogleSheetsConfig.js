const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const SystemConfig = require('../models/SystemConfig');

async function setupGoogleSheetsConfig() {
  try {
    console.log('🔧 Google Sheets konfigürasyonu kuruluyor...');
    
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/meumt-web';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB bağlantısı kuruldu');

    const keyFilePath = path.join(__dirname, '../config/google-service-account.json');
    if (!fs.existsSync(keyFilePath)) {
      throw new Error(`Kredential dosyası bulunamadı: ${keyFilePath}`);
    }

    const keyFileContent = fs.readFileSync(keyFilePath, 'utf-8');
    console.log('🔑 Kredential dosyası başarıyla okundu.');

    let systemConfig = await SystemConfig.findOne();
    
    if (!systemConfig) {
      console.log('📋 SystemConfig bulunamadı, yeni oluşturuluyor...');
      systemConfig = new SystemConfig();
    } else {
      console.log('📋 Mevcut SystemConfig güncelleniyor...');
    }
    
    systemConfig.googleSheets = {
      url: 'https://docs.google.com/spreadsheets/d/195xqak9XApyCVAxEQ7ik777oL_nIKEeiiZtsqasRXY8/edit#gid=0',
      spreadsheetId: '195xqak9XApyCVAxEQ7ik777oL_nIKEeiiZtsqasRXY8',
      isActive: true,
      autoSync: true
    };
    
    systemConfig.googleServiceAccountKey = keyFileContent;

    await systemConfig.save();
    console.log('✅ SystemConfig, Google Sheets URL ve Kredential ile güncellendi.');

    const updatedConfig = await SystemConfig.findOne();
    console.log('\n📊 Güncel Google Sheets Konfigürasyonu:');
    console.log('- URL:', updatedConfig.googleSheets?.url);
    console.log('- Spreadsheet ID:', updatedConfig.googleSheets?.spreadsheetId);
    console.log('- Kredential bilgisi kaydedildi:', !!updatedConfig.googleServiceAccountKey);

    console.log('\n✨ Google Sheets konfigürasyonu başarıyla tamamlandı!');

  } catch (error) {
    console.error('❌ Setup Google Sheets hatası:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB bağlantısı kapatıldı');
  }
}

if (require.main === module) {
  setupGoogleSheetsConfig();
}

module.exports = setupGoogleSheetsConfig; 