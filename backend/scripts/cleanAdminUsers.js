const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

async function cleanAdminUsers() {
  try {
    console.log('🧹 Admin kullanıcıları temizleniyor...');
    
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/meumt_web';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB bağlantısı kuruldu');

    const allUsers = await User.find({});
    console.log(`📋 Toplam kullanıcı sayısı: ${allUsers.length}`);
    
    for (const user of allUsers) {
      console.log(`- ${user._id}: ${user.username || 'NO USERNAME'} (${user.email}) - Role: ${user.role}`);
    }

    const deleteResult = await User.deleteMany({ role: 'admin' });
    console.log(`🗑️ Silinen admin kullanıcı sayısı: ${deleteResult.deletedCount}`);

    const deleteUsernameResult = await User.deleteMany({ username: 'meumuzik' });
    console.log(`🗑️ Silinen 'meumuzik' kullanıcı sayısı: ${deleteUsernameResult.deletedCount}`);

    console.log('➕ Yeni admin kullanıcısı oluşturuluyor...');
    
    const newAdmin = await User.create({
      username: 'meumuzik',
      email: 'admin@meumt.edu.tr',
      password: 'admin123456',
      fullName: 'MEÜMT Admin',
      firstName: 'MEÜMT',
      lastName: 'Admin',
      tcKimlikNo: '12345678901',
      studentNumber: 'ADMIN001',
      role: 'admin',
      isActive: true,
      isEmailVerified: true,
      membershipStatus: 'APPROVED'
    });
    
    console.log('✅ Yeni admin kullanıcısı oluşturuldu:', newAdmin.username);

    console.log('\n🧪 Login testi yapılıyor...');
    const testUser = await User.findOne({ username: 'meumuzik' }).select('+password');
    
    if (testUser) {
      console.log(`📋 Kullanıcı bulundu:`);
      console.log(`- ID: ${testUser._id}`);
      console.log(`- Username: ${testUser.username}`);
      console.log(`- Email: ${testUser.email}`);
      console.log(`- Role: ${testUser.role}`);
      console.log(`- Active: ${testUser.isActive}`);
      
      const isMatch = await testUser.comparePassword('admin123456');
      console.log(`- Password Match: ${isMatch}`);
    } else {
      console.log('❌ Test kullanıcı bulunamadı!');
    }

  } catch (error) {
    console.error('❌ Clean admin hatası:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB bağlantısı kapatıldı');
    process.exit(0);
  }
}

if (require.main === module) {
  cleanAdminUsers();
}

module.exports = cleanAdminUsers; 