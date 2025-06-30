const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
require('dotenv').config();

async function testAdminAuth() {
  try {
    console.log('\n🔐 Admin authentication testi başlatılıyor...');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB bağlantısı başarılı');

    const adminData = {
      email: 'admin@meumt.edu.tr',
      password: 'admin123',
      role: 'admin'
    };

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminData.password, salt);

    const admin = await User.create({
      email: adminData.email,
      password: hashedPassword,
      role: adminData.role
    });

    logger.info('Admin user created:', admin.email);

    const isMatch = await bcrypt.compare(adminData.password, admin.password);
    logger.info('Password match:', isMatch);

    const token = jwt.sign(
      { id: admin._id, email: admin.email, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    logger.info('JWT token generated');

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    logger.info('Token verified:', decoded);

    console.log('\n✅ Tüm testler başarılı!');
    return {
      success: true,
      message: 'Admin authentication tests passed successfully'
    };
  } catch (error) {
    console.error('\n❌ Test hatası:', error.message);
    return {
      success: false,
      message: error.message
    };
  }
}

testAdminAuth().then(result => {
  if (result.success) {
    logger.info('✅ Admin authentication tests completed successfully');
  } else {
    logger.error('❌ Admin authentication tests failed:', result.message);
  }
}); 