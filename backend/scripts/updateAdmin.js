const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = 'mongodb://127.0.0.1:27017/meumt_web';

const updateAdmin = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB Connected');
    
    const userCollection = mongoose.connection.db.collection('users');
    
    const users = await userCollection.find({}).toArray();
    console.log('📋 Mevcut kullanıcılar:');
    users.forEach(user => {
      console.log(`- ${user.username || 'NO_USERNAME'} (${user.email}) - Role: ${user.role || 'user'}`);
    });
    
    let adminUser = await userCollection.findOne({ role: 'admin' });
    
    if (!adminUser) {
      adminUser = await userCollection.findOne({ email: { $regex: /admin/i } });
    }
    
    if (!adminUser) {
      adminUser = await userCollection.findOne({ username: { $regex: /admin/i } });
    }
    
    if (adminUser) {
      console.log('✅ Admin kullanıcısı bulundu:', adminUser.email);
      
      const hashedPassword = await bcrypt.hash('admin123456', 12);
      
      await userCollection.updateOne(
        { _id: adminUser._id },
        {
          $set: {
            username: 'admin',
            email: 'admin@meumt.com',
            password: hashedPassword,
            role: 'admin',
            isActive: true,
            firstName: 'Admin',
            lastName: 'User',
            fullName: 'Admin User'
          }
        }
      );
      
      console.log('✅ Admin kullanıcısı güncellendi');
      
    } else {
      console.log('🔨 Yeni admin oluşturuluyor...');
      
      const hashedPassword = await bcrypt.hash('admin123456', 12);
      
      await userCollection.deleteMany({ username: 'admin' });
      
      const newAdminUser = {
        firstName: 'Admin',
        lastName: 'User',
        fullName: 'Admin User',
        username: 'admin',
        email: 'admin@meumt.com',
        password: hashedPassword,
        phone: '05555555555',
        tcKimlikNo: '11111111111',
        department: 'Yönetim',
        studentNumber: 'ADMIN001',
        role: 'admin',
        isActive: true,
        isEmailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await userCollection.insertOne(newAdminUser);
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

updateAdmin(); 