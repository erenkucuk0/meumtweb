const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = 'mongodb://127.0.0.1:27017/meumt_web';

const testLogin = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB Connected');
    
    const userCollection = mongoose.connection.db.collection('users');
    
    const adminUser = await userCollection.findOne({ email: 'admin@meumt.com' });
    
    if (!adminUser) {
      console.log('❌ Admin kullanıcısı bulunamadı');
      return;
    }
    
    console.log('✅ Admin kullanıcısı bulundu:');
    console.log('- Email:', adminUser.email);
    console.log('- Username:', adminUser.username);
    console.log('- Role:', adminUser.role);
    console.log('- isActive:', adminUser.isActive);
    console.log('- Password Hash:', adminUser.password ? adminUser.password.substring(0, 20) + '...' : 'NO PASSWORD');
    
    if (adminUser.password) {
      console.log('\n🔐 Şifre test ediliyor...');
      
      const testPassword = 'admin123456';
      const isMatch = await bcrypt.compare(testPassword, adminUser.password);
      
      console.log('Password test result:', isMatch);
      
      if (!isMatch) {
        console.log('⚠️ Şifre eşleşmiyor, yeni hash oluşturuluyor...');
        
        const newHashedPassword = await bcrypt.hash(testPassword, 12);
        
        await userCollection.updateOne(
          { email: 'admin@meumt.com' },
          {
            $set: {
              password: newHashedPassword
            }
          }
        );
        
        console.log('✅ Şifre güncellendi');
        
        const reTestMatch = await bcrypt.compare(testPassword, newHashedPassword);
        console.log('Re-test result:', reTestMatch);
      } else {
        console.log('✅ Şifre doğru');
      }
    }
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('📦 MongoDB bağlantısı kapatıldı');
    process.exit(0);
  }
};

testLogin(); 