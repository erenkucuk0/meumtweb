const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '../.env' });

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB bağlantı hatası:', error);
    process.exit(1);
  }
};

const createAdminUser = async () => {
  try {
    await connectDB();
    
    const User = require('../models/User');
    
    const existingAdmin = await User.findOne({ email: 'admin@meumt.com' });
    
    if (existingAdmin) {
      console.log('✅ Admin kullanıcısı zaten mevcut');
      
      const hashedPassword = await bcrypt.hash('admin123456', 12);
      existingAdmin.password = hashedPassword;
      existingAdmin.role = 'admin';
      existingAdmin.isActive = true;
      await existingAdmin.save();
      
      console.log('✅ Admin şifresi güncellendi: admin123456');
      process.exit(0);
    }
    
    const hashedPassword = await bcrypt.hash('admin123456', 12);
    
    const adminUser = new User({
      firstName: 'Admin',
      lastName: 'User',
      fullName: 'Admin User',
      username: 'admin',
      email: 'admin@meumt.com',
      password: hashedPassword,
      phone: '05555555555',
      tcKimlikNo: '12345678901',
      department: 'Yönetim',
      studentNumber: 'ADMIN001',
      role: 'admin',
      isActive: true,
      isEmailVerified: true
    });
    
    await adminUser.save();
    
    console.log('✅ Admin kullanıcısı oluşturuldu:');
    console.log('📧 Email: admin@meumt.com');
    console.log('🔑 Şifre: admin123456');
    console.log('👤 Kullanıcı adı: admin');
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

createAdminUser(); 