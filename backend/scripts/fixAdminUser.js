const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

async function fixAdminUser() {
  try {
    console.log('🔧 Admin kullanıcısı sorunları çözülüyor...');
    
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/meumt_web';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB bağlantısı kuruldu');

    const adminUsers = await User.find({ role: 'admin' });
    console.log(`📋 Bulunan admin kullanıcı sayısı: ${adminUsers.length}`);

    if (adminUsers.length === 0) {
      console.log('❌ Admin kullanıcısı bulunamadı, yeni oluşturuluyor...');
      
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash('admin123456', salt);
      
      const newAdmin = await User.create({
        username: 'meumuzik',
        email: 'admin@meumt.edu.tr',
        password: hashedPassword,
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
    } else {
      const admin = adminUsers[0];
      console.log(`🔧 Mevcut admin düzeltiliyor: ${admin._id}`);
      
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash('admin123456', salt);
      
      await User.findByIdAndUpdate(admin._id, {
        username: 'meumuzik',
        email: 'admin@meumt.edu.tr',
        password: hashedPassword,
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
      
      console.log('✅ Admin kullanıcısı güncellendi');
    }

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
    console.error('❌ Fix admin hatası:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB bağlantısı kapatıldı');
    process.exit(0);
  }
}

if (require.main === module) {
  fixAdminUser();
}

module.exports = fixAdminUser; 