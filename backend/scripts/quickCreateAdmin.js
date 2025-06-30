const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = 'mongodb://127.0.0.1:27017/meumt_web';

const createQuickAdmin = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB Connected');
    
    const userCollection = mongoose.connection.db.collection('users');
    
    const existingAdmin = await userCollection.findOne({ email: 'admin@meumt.com' });
    
    if (existingAdmin) {
      console.log('✅ Admin zaten mevcut, şifre güncelleniyor...');
      
      const hashedPassword = await bcrypt.hash('admin123456', 12);
      
      await userCollection.updateOne(
        { email: 'admin@meumt.com' },
        {
          $set: {
            password: hashedPassword,
            role: 'admin',
            isActive: true
          }
        }
      );
      
      console.log('✅ Admin şifresi güncellendi');
    } else {
      console.log('🔨 Yeni admin oluşturuluyor...');
      
      const hashedPassword = await bcrypt.hash('admin123456', 12);
      
      const adminUser = {
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
        isEmailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await userCollection.insertOne(adminUser);
      console.log('✅ Admin kullanıcısı oluşturuldu');
    }
    
    console.log('\n📝 Giriş Bilgileri:');
    console.log('📧 Email: admin@meumt.com');
    console.log('🔑 Şifre: admin123456');
    console.log('👤 Kullanıcı adı: admin');
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('📦 MongoDB bağlantısı kapatıldı');
    process.exit(0);
  }
};

createQuickAdmin(); 