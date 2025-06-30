const mongoose = require('mongoose');
const SystemConfig = require('../models/SystemConfig');

async function setupSystemConfig() {
  try {
    console.log('🔧 SystemConfig kurulumu başlatılıyor...');
    
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/meumt_development';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB bağlantısı kuruldu');

    let systemConfig = await SystemConfig.findOne();
    
    if (systemConfig) {
      console.log('📋 Mevcut SystemConfig bulundu');
    } else {
      console.log('📋 SystemConfig bulunamadı, yeni oluşturuluyor...');
      
      systemConfig = new SystemConfig({
        isActive: true,
        type: 'main',
        membershipFee: {
          amount: 50,
          currency: 'TL'
        },
        paymentInfo: {
          ibanNumber: 'TR00 0000 0000 0000 0000 0000 00',
          bankName: 'Türkiye İş Bankası',
          accountHolderName: 'MEUMT Topluluk Hesabı',
          description: 'Üyelik ücretinizi bu hesaba yatırarak dekont fotoğrafını yükleyiniz.'
        },
        siteSettings: {
          siteName: 'MEUMT Müzik Topluluğu',
          siteDescription: 'Mersin Üniversitesi Müzik Topluluğu resmi web sitesi',
          contactEmail: 'iletisim@meumt.com'
        },
        googleSheets: {
          isEnabled: false,
          isActive: false,
          spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/195xqak9XApyCVAxEQ7ik777oL_nIKEeiiZtsqasRXY8/edit',
          worksheetName: 'Sheet1',
          autoSync: false,
          syncInterval: 30,
          credentials: {
            type: 'service_account',
            data: null
          }
        },
        version: '1.0.0'
      });

      await systemConfig.save();
      console.log('✅ SystemConfig oluşturuldu');
    }

    console.log('📊 Mevcut SystemConfig durumu:');
    console.log('- ID:', systemConfig._id);
    console.log('- Aktif:', systemConfig.isActive);
    console.log('- Google Sheets isEnabled:', systemConfig.googleSheets?.isEnabled);
    console.log('- Google Sheets isActive:', systemConfig.googleSheets?.isActive);
    console.log('- Spreadsheet URL:', systemConfig.googleSheets?.spreadsheetUrl);
    console.log('- Üyelik ücreti:', systemConfig.membershipFee?.amount, systemConfig.membershipFee?.currency);

    console.log('🔧 Google Sheets etkinleştiriliyor...');
    systemConfig.googleSheets.isEnabled = true;
    systemConfig.googleSheets.isActive = true;
    await systemConfig.save();
    console.log('✅ Google Sheets etkinleştirildi');

    console.log('✅ SystemConfig kurulumu tamamlandı');

  } catch (error) {
    console.error('❌ SystemConfig kurulum hatası:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB bağlantısı kapatıldı');
  }
}

if (require.main === module) {
  setupSystemConfig();
}

module.exports = setupSystemConfig; 