const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/meumt_web');
    console.log('MongoDB bağlantısı başarılı');

    await User.deleteMany({
      $or: [
        { username: 'meumuzik' },
        { email: 'admin@meumt.edu.tr' },
        { role: 'admin' }
      ]
    });
    console.log('Mevcut admin kullanıcıları silindi');

    const adminUser = await User.create({
      username: 'meumuzik',
      email: 'admin@meumt.edu.tr',
      password: 'admin123456',
      firstName: 'MEÜMT',
      lastName: 'Admin',
      fullName: 'MEÜMT Admin',
      studentNumber: '000000000',
      role: 'admin',
      isActive: true,
      department: 'Yönetim',
      isEmailVerified: true
    });

    console.log('Admin kullanıcısı başarıyla oluşturuldu:');
    console.log('ID:', adminUser._id);
    console.log('Kullanıcı Adı:', adminUser.username);
    console.log('Email:', adminUser.email);
    console.log('Şifre: admin123456');
    console.log('Rol:', adminUser.role);

    const verifyUser = await User.findOne({ username: 'meumuzik' }).select('+password');
    console.log('\nDoğrulama:');
    console.log('Kullanıcı bulundu:', !!verifyUser);
    console.log('Username:', verifyUser?.username);
    console.log('Email:', verifyUser?.email);
    console.log('Şifre var:', !!verifyUser?.password);

    process.exit(0);
  } catch (error) {
    console.error('Admin oluşturma hatası:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  seedAdmin();
}

module.exports = seedAdmin; 