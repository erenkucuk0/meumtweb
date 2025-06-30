const mongoose = require('mongoose');
const CommunityMember = require('../models/CommunityMember');

async function createCommunityTestApplication() {
  try {
    console.log('📝 Community test başvurusu oluşturuluyor...');
    
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/meumt_development';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB bağlantısı kuruldu');

    const testApplication = new CommunityMember({
      fullName: 'Onay Bir',
      firstName: 'Onay',
      lastName: 'Bir',
      tcKimlikNo: '98765432100',
      studentNumber: '20250001',
      phone: '05345347457',
      department: 'Bilgisayar Mühendisliği',
      email: 'onay.bir@example.com',
      applicationSource: 'WEBSITE',
      status: 'PENDING'
    });

    await testApplication.save();
    console.log('✅ Community test başvurusu oluşturuldu:');
    console.log('- ID:', testApplication._id);
    console.log('- Ad Soyad:', testApplication.fullName);
    console.log('- TC:', testApplication.tcKimlikNo);
    console.log('- Öğrenci No:', testApplication.studentNumber);
    console.log('- Durum:', testApplication.statusDisplay);
    
    console.log('\n🎯 Bu başvuruyu admin panelinden onaylayıp Google Sheets\'e eklendiğini kontrol edebilirsiniz!');
    console.log('🌐 Frontend URL: http://localhost:3006');
    console.log('🔐 Admin hesabıyla giriş yapın ve "Admin Settings" bölümünden onaylayın');

  } catch (error) {
    console.error('❌ Community test başvurusu oluşturma hatası:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB bağlantısı kapatıldı');
  }
}

if (require.main === module) {
  createCommunityTestApplication();
}

module.exports = createCommunityTestApplication; 