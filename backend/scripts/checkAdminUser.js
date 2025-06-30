const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/meumt-web');

async function checkAdminUser() {
  try {
    console.log('👤 Admin kullanıcısı kontrol ediliyor...');
    
    const adminUser = await User.findOne({ email: 'admin@meumt.com' }).select('+password');
    
    if (!adminUser) {
      console.log('❌ Admin kullanıcısı bulunamadı');
      
      console.log('🔨 Admin kullanıcısı oluşturuluyor...');
      
      const hashedPassword = await bcrypt.hash('admin123', 12);
      
      const newAdmin = new User({
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@meumt.com',
        password: hashedPassword,
        role: 'admin',
        isActive: true,
        membershipStatus: 'APPROVED',
        tcKimlikNo: '00000000000', // Admin için dummy TC
        studentNumber: 'ADMIN001' // Admin için dummy öğrenci no
      });
      
      await newAdmin.save();
      console.log('✅ Admin kullanıcısı oluşturuldu');
      
    } else {
      console.log('✅ Admin kullanıcısı bulundu');
      console.log('📋 Admin bilgileri:');
      console.log(`   Email: ${adminUser.email}`);
      console.log(`   Role: ${adminUser.role}`);
      console.log(`   Active: ${adminUser.isActive}`);
      console.log(`   Password hash: ${adminUser.password ? 'Var' : 'Yok'}`);
      
      const passwordTest = await bcrypt.compare('admin123', adminUser.password);
      console.log(`   Şifre 'admin123' doğru mu: ${passwordTest}`);
      
      if (!passwordTest) {
        console.log('🔧 Şifre güncelleniyor...');
        const hashedPassword = await bcrypt.hash('admin123', 12);
        adminUser.password = hashedPassword;
        await adminUser.save();
        console.log('✅ Şifre güncellendi');
      }
    }
    
    const allAdmins = await User.find({ role: 'admin' });
    console.log(`\n👥 Toplam admin sayısı: ${allAdmins.length}`);
    
    allAdmins.forEach((admin, index) => {
      console.log(`${index + 1}. ${admin.firstName} ${admin.lastName} (${admin.email}) - ${admin.isActive ? 'Aktif' : 'Pasif'}`);
    });
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}

checkAdminUser(); 