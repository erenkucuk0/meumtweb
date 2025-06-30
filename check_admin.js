const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function checkAndFixAdmin() {
  try {
    console.log('🔍 Admin kullanıcısını kontrol ediyorum...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/meumt_web');
    console.log('✅ MongoDB bağlantısı başarılı');

    // User modelini yükle
    const User = require('./backend/models/User');
    
    // Admin kullanıcısını bul
    const admin = await User.findOne({ email: 'admin@meumt.edu.tr' });
    
    if (!admin) {
      console.log('❌ Admin kullanıcısı bulunamadı, yeni admin oluşturuluyor...');
      
      // Yeni admin oluştur
      const newAdmin = new User({
        fullName: 'System Administrator',
        firstName: 'System',
        lastName: 'Administrator',
        username: 'admin',
        email: 'admin@meumt.edu.tr',
        password: 'admin123', // Bu hash'lenecek
        role: 'admin',
        isActive: true,
        membershipStatus: 'APPROVED',
        isEmailVerified: true,
        tcKimlikNo: '99999999999',
        studentNumber: 'ADMIN001'
      });
      
      await newAdmin.save();
      console.log('✅ Yeni admin kullanıcısı oluşturuldu');
      console.log(`   Email: ${newAdmin.email}`);
      console.log(`   Şifre: admin123`);
      console.log(`   Role: ${newAdmin.role}`);
      
    } else {
      console.log('✅ Admin kullanıcısı bulundu');
      console.log(`   Email: ${admin.email}`);
      console.log(`   Role: ${admin.role}`);
      console.log(`   Status: ${admin.isActive ? 'Aktif' : 'Pasif'}`);
      
      // Şifreyi güncelle
      console.log('\n🔄 Admin şifresini admin123 olarak güncelliyorum...');
      const salt = await bcrypt.genSalt(10);
      admin.password = await bcrypt.hash('admin123', salt);
      await admin.save();
      console.log('✅ Admin şifresi güncellendi');
    }
    
  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB bağlantısı kapatıldı');
    process.exit(0);
  }
}

checkAndFixAdmin(); 