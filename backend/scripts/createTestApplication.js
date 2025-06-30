const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const CommunityMember = require('../models/CommunityMember');

const DATABASE_URL = process.env.DATABASE_URL || 'mongodb://localhost:27017/meumt_web';

async function createTestApplication() {
  try {
    console.log('🚀 Test başvurusu oluşturuluyor...\n');

    await mongoose.connect(DATABASE_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Veritabanı bağlantısı kuruldu');

    const randomSuffix = Math.floor(Math.random() * 100);
    const testApplication = await CommunityMember.create({
      fullName: 'Test Kullanıcı ' + Date.now(),
      tcKimlikNo: '12345678901', // Valid 11-digit TC number
      studentNumber: '2024' + randomSuffix.toString().padStart(5, '0'),
      phone: '+90 555 123 45 67',
      phoneNumber: '+90 555 123 45 67',
      department: 'Bilgisayar Mühendisliği',
      email: 'test@example.com',
      status: 'PENDING',
      applicationSource: 'WEBSITE',
      paymentReceiptImage: 'test-receipt.jpg'
    });

    console.log('✅ Test başvurusu oluşturuldu:');
    console.log('   - ID:', testApplication._id);
    console.log('   - Ad Soyad:', testApplication.fullName);
    console.log('   - TC:', testApplication.tcKimlikNo);
    console.log('   - Öğrenci No:', testApplication.studentNumber);
    console.log('   - Durum:', testApplication.status);
    console.log('   - Kaynak:', testApplication.applicationSource);

    console.log('\n🎉 Test başvurusu başarıyla oluşturuldu!');
    console.log('💡 Bu başvuruyu admin panelinden görebilir ve onaylayabilirsiniz.');

  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Veritabanı bağlantısı kapatıldı');
  }
}

if (require.main === module) {
  createTestApplication();
}

module.exports = createTestApplication; 